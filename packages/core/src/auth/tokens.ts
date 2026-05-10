import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DbClient } from '../database/client.js';

export const TOKEN_PREFIX = 'icms_';
export type TokenScope = 'read' | 'write' | 'admin';

export interface TokenRecord {
  id: string;
  name: string;
  scope: TokenScope;
  created_at: string;
  last_used_at: string | null;
}

export interface MintedToken {
  id: string;
  name: string;
  scope: TokenScope;
  plaintext: string;
}

export function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(32).toString('base64url');
}

export function hashToken(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export async function mintToken(
  db: DbClient,
  opts: { name: string; scope: TokenScope; createdBy?: string | null; plaintext?: string }
): Promise<MintedToken> {
  const plaintext = opts.plaintext ?? generateToken();
  if (!plaintext.startsWith(TOKEN_PREFIX)) {
    throw new Error(`Token must start with "${TOKEN_PREFIX}" prefix`);
  }
  const id = randomUUID();
  const hash = hashToken(plaintext);
  await db.query(
    `INSERT INTO "_infernocms_tokens" (id, name, scope, token_hash, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, opts.name, opts.scope, hash, opts.createdBy ?? null]
  );
  return { id, name: opts.name, scope: opts.scope, plaintext };
}

export async function lookupToken(
  db: DbClient,
  plaintext: string
): Promise<{ id: string; name: string; scope: TokenScope } | null> {
  if (!plaintext || !plaintext.startsWith(TOKEN_PREFIX)) return null;
  const hash = hashToken(plaintext);
  const r = await db.query<{ id: string; name: string; scope: TokenScope }>(
    `SELECT id, name, scope FROM "_infernocms_tokens"
     WHERE token_hash = $1 AND revoked_at IS NULL LIMIT 1`,
    [hash]
  );
  const row = r.rows[0];
  if (!row) return null;
  // Update last_used_at synchronously. Cheap (one indexed UPDATE) and avoids
  // PGlite WASM concurrency issues that fire-and-forget would introduce.
  await db.query(
    `UPDATE "_infernocms_tokens" SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [row.id]
  );
  return row;
}

export async function listTokens(db: DbClient): Promise<TokenRecord[]> {
  const r = await db.query<TokenRecord>(
    `SELECT id, name, scope, created_at, last_used_at FROM "_infernocms_tokens"
     WHERE revoked_at IS NULL ORDER BY created_at DESC`
  );
  return r.rows;
}

export async function revokeToken(db: DbClient, id: string): Promise<void> {
  await db.query(
    `UPDATE "_infernocms_tokens" SET revoked_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND revoked_at IS NULL`,
    [id]
  );
}

export async function adminTokenCount(db: DbClient): Promise<number> {
  const r = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM "_infernocms_tokens"
     WHERE scope = 'admin' AND revoked_at IS NULL`
  );
  return Number(r.rows[0]?.count ?? 0);
}
