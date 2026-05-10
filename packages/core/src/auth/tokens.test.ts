import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import type { DbClient, QueryResult } from '../database/client.js';
import { ensureSystemTables } from './system-tables.js';
import {
  generateToken,
  hashToken,
  mintToken,
  lookupToken,
  listTokens,
  revokeToken,
  TOKEN_PREFIX,
} from './tokens.js';

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

describe('token primitives', () => {
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

  it('generateToken returns prefixed base64url string', () => {
    const t = generateToken();
    expect(t.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(t.length).toBeGreaterThan(40);
    expect(generateToken()).not.toBe(t);
  });

  it('hashToken is deterministic sha256 hex', () => {
    expect(hashToken('icms_abc')).toBe(hashToken('icms_abc'));
    expect(hashToken('icms_abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('icms_abc')).not.toBe(hashToken('icms_xyz'));
  });

  it('mintToken stores hash and returns plaintext', async () => {
    const result = await mintToken(db, { name: 'pipeline', scope: 'write' });
    expect(result.plaintext.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.scope).toBe('write');

    const r = await pg.query<{ token_hash: string }>(
      `SELECT token_hash FROM _infernocms_tokens WHERE id = $1`,
      [result.id]
    );
    expect(r.rows[0].token_hash).toBe(hashToken(result.plaintext));
  });

  it('lookupToken finds active tokens by plaintext', async () => {
    const m = await mintToken(db, { name: 'p', scope: 'admin' });
    const found = await lookupToken(db, m.plaintext);
    expect(found).toMatchObject({ id: m.id, scope: 'admin', name: 'p' });
  });

  it('lookupToken updates last_used_at', async () => {
    const m = await mintToken(db, { name: 'p', scope: 'read' });
    await lookupToken(db, m.plaintext);
    const r = await pg.query<{ last_used_at: string | null }>(
      `SELECT last_used_at FROM _infernocms_tokens WHERE id = $1`,
      [m.id]
    );
    expect(r.rows[0].last_used_at).not.toBeNull();
  });

  it('lookupToken returns null for unknown token', async () => {
    expect(await lookupToken(db, 'icms_doesnotexist')).toBeNull();
  });

  it('lookupToken returns null for tokens missing prefix', async () => {
    expect(await lookupToken(db, 'random-string')).toBeNull();
  });

  it('revokeToken makes lookups fail', async () => {
    const m = await mintToken(db, { name: 'p', scope: 'admin' });
    await revokeToken(db, m.id);
    expect(await lookupToken(db, m.plaintext)).toBeNull();
  });

  it('revokeToken is idempotent', async () => {
    const m = await mintToken(db, { name: 'p', scope: 'admin' });
    await revokeToken(db, m.id);
    await revokeToken(db, m.id); // no throw
  });

  it('listTokens returns non-revoked, no hashes', async () => {
    const a = await mintToken(db, { name: 'a', scope: 'read' });
    const b = await mintToken(db, { name: 'b', scope: 'write' });
    await revokeToken(db, b.id);
    const list = await listTokens(db);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, name: 'a', scope: 'read' });
    expect(list[0]).not.toHaveProperty('token_hash');
  });
});
