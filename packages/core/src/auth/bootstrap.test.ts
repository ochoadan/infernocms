import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { DbClient, QueryResult } from '../database/client.js';
import { ensureSystemTables } from './system-tables.js';
import { adminTokenCount, hashToken, TOKEN_PREFIX } from './tokens.js';
import { runBootstrap } from './bootstrap.js';

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

describe('runBootstrap', () => {
  let pg: PGlite;
  let db: DbClient;
  let tmpCwd: string;
  let logs: string[];

  beforeEach(async () => {
    pg = new PGlite();
    db = makeAdapter(pg);
    await ensureSystemTables(db);
    tmpCwd = mkdtempSync(join(tmpdir(), 'icms-bootstrap-'));
    logs = [];
    delete process.env.INFERNOCMS_BOOTSTRAP_TOKEN;
  });

  afterEach(async () => {
    delete process.env.INFERNOCMS_BOOTSTRAP_TOKEN;
    await db.close();
  });

  it('uses INFERNOCMS_BOOTSTRAP_TOKEN env when set', async () => {
    const env = 'icms_supplied_by_cloud_provisioner_aaaaaa';
    process.env.INFERNOCMS_BOOTSTRAP_TOKEN = env;
    await runBootstrap(db, { cwd: tmpCwd, log: (l) => logs.push(l) });

    const r = await pg.query<{ token_hash: string; name: string; scope: string }>(
      `SELECT token_hash, name, scope FROM _infernocms_tokens`
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].token_hash).toBe(hashToken(env));
    expect(r.rows[0].scope).toBe('admin');
    expect(r.rows[0].name).toBe('bootstrap');
  });

  it('env var path is idempotent', async () => {
    process.env.INFERNOCMS_BOOTSTRAP_TOKEN = 'icms_idempotent_test_token_aaaaaa';
    await runBootstrap(db, { cwd: tmpCwd, log: () => {} });
    await runBootstrap(db, { cwd: tmpCwd, log: () => {} });
    expect(await adminTokenCount(db)).toBe(1);
  });

  it('rejects env var without icms_ prefix', async () => {
    process.env.INFERNOCMS_BOOTSTRAP_TOKEN = 'no-prefix';
    await expect(runBootstrap(db, { cwd: tmpCwd, log: () => {} })).rejects.toThrow(/prefix/i);
  });

  it('generates a token when no env and no admin tokens exist', async () => {
    await runBootstrap(db, { cwd: tmpCwd, log: (l) => logs.push(l) });
    expect(await adminTokenCount(db)).toBe(1);
    expect(logs.some((l) => l.includes(TOKEN_PREFIX))).toBe(true);
  });

  it('generated path appends to existing .env', async () => {
    const envPath = join(tmpCwd, '.env');
    writeFileSync(envPath, 'EXISTING=value\n');
    await runBootstrap(db, { cwd: tmpCwd, log: () => {} });
    const contents = readFileSync(envPath, 'utf-8');
    expect(contents).toMatch(/EXISTING=value/);
    expect(contents).toMatch(/INFERNOCMS_BOOTSTRAP_TOKEN=icms_/);
  });

  it('generated path does NOT create .env if absent', async () => {
    await runBootstrap(db, { cwd: tmpCwd, log: () => {} });
    expect(existsSync(join(tmpCwd, '.env'))).toBe(false);
  });

  it('no-ops if admin token already exists and no env var', async () => {
    process.env.INFERNOCMS_BOOTSTRAP_TOKEN = 'icms_first_run_token_aaaaaaaaaaaaa';
    await runBootstrap(db, { cwd: tmpCwd, log: () => {} });
    delete process.env.INFERNOCMS_BOOTSTRAP_TOKEN;
    await runBootstrap(db, { cwd: tmpCwd, log: (l) => logs.push(l) });
    expect(await adminTokenCount(db)).toBe(1);
    expect(logs.some((l) => l.includes(TOKEN_PREFIX))).toBe(false);
  });
});
