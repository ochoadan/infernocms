import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import type { DbClient, QueryResult } from '../database/client.js';
import { ensureSystemTables } from './system-tables.js';

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

describe('ensureSystemTables', () => {
  let pg: PGlite;
  let db: DbClient;

  beforeEach(async () => {
    pg = new PGlite();
    db = makeAdapter(pg);
  });

  afterEach(async () => {
    await db.close();
  });

  it('creates _infernocms_tokens with expected columns', async () => {
    await ensureSystemTables(db);
    const r = await pg.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = '_infernocms_tokens'`
    );
    const cols = r.rows.map((x) => x.column_name).sort();
    expect(cols).toEqual(
      ['created_at', 'created_by', 'id', 'last_used_at', 'name', 'revoked_at', 'scope', 'token_hash'].sort()
    );
  });

  it('is idempotent', async () => {
    await ensureSystemTables(db);
    await ensureSystemTables(db);
    const r = await pg.query(`SELECT 1 FROM _infernocms_tokens`);
    expect(r.rows).toEqual([]);
  });
});
