import type { DbClient } from '../database/client.js';

export async function ensureSystemTables(db: DbClient): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS "_infernocms_tokens" (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    scope        TEXT NOT NULL CHECK (scope IN ('read','write','admin')),
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by   TEXT NULL REFERENCES "_infernocms_tokens"(id) ON DELETE SET NULL,
    last_used_at TIMESTAMP NULL,
    revoked_at   TIMESTAMP NULL
  );`);
  await db.exec(
    `CREATE INDEX IF NOT EXISTS "idx_tokens_hash_active"
     ON "_infernocms_tokens" (token_hash) WHERE revoked_at IS NULL;`
  );
}
