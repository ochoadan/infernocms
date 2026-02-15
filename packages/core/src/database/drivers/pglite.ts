import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
import type { DbClient, QueryResult } from '../client.js';

export async function createPGliteClient(dataDir: string): Promise<DbClient> {
  await mkdir(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);

  return {
    async query<T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await pglite.query<T>(sql, params);
      return { rows: result.rows, affectedRows: result.affectedRows };
    },
    async exec(sql: string): Promise<void> {
      await pglite.exec(sql);
    },
    async close(): Promise<void> {
      await pglite.close();
    },
  };
}
