import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { PGlite } from '@electric-sql/pglite';
import type { DbClient, QueryResult } from '../database/client.js';
import { ensureSystemTables } from './system-tables.js';
import { mintToken } from './tokens.js';
import { registerAuthMiddleware } from './middleware.js';

function makeAdapter(pg: PGlite): DbClient {
  const client: DbClient = {
    async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
      const r = await pg.query<T>(sql, params);
      return { rows: r.rows, affectedRows: r.affectedRows };
    },
    async exec(sql: string): Promise<void> {
      await pg.exec(sql);
    },
    async close(): Promise<void> {
      await pg.close();
    },
    async transaction<T>(fn: (c: DbClient) => Promise<T>): Promise<T> {
      return fn(client);
    },
  };
  return client;
}

describe('auth middleware', () => {
  let pg: PGlite;
  let db: DbClient;

  beforeEach(async () => {
    pg = new PGlite();
    db = makeAdapter(pg);
    await ensureSystemTables(db);
  });

  afterEach(async () => {
    await db.close();
  });

  async function buildApp() {
    const app = Fastify({ logger: false });
    registerAuthMiddleware(app, db);
    app.get('/whoami', async (req) => {
      const user = (req as unknown as Record<string, unknown>).user;
      return user ?? null;
    });
    return app;
  }

  it('attaches req.user when valid bearer token is present', async () => {
    const t = await mintToken(db, { name: 'p', scope: 'write' });
    const app = await buildApp();
    const r = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: `Bearer ${t.plaintext}` },
    });
    const body = JSON.parse(r.body);
    expect(body).toMatchObject({ id: t.id, scope: 'write', _isAdmin: false });
    await app.close();
  });

  it('admin scope sets _isAdmin true', async () => {
    const t = await mintToken(db, { name: 'a', scope: 'admin' });
    const app = await buildApp();
    const r = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: `Bearer ${t.plaintext}` },
    });
    expect(JSON.parse(r.body)._isAdmin).toBe(true);
    await app.close();
  });

  it('leaves req.user unset for missing header', async () => {
    const app = await buildApp();
    const r = await app.inject({ method: 'GET', url: '/whoami' });
    expect(r.body).toBe('null');
    await app.close();
  });

  it('leaves req.user unset for malformed header', async () => {
    const app = await buildApp();
    const r = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: 'Basic xxx' },
    });
    expect(r.body).toBe('null');
    await app.close();
  });

  it('leaves req.user unset for unknown token', async () => {
    const app = await buildApp();
    const r = await app.inject({
      method: 'GET',
      url: '/whoami',
      headers: { authorization: 'Bearer icms_unknown' },
    });
    expect(r.body).toBe('null');
    await app.close();
  });
});
