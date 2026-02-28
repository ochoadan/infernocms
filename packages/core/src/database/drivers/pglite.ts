import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
import type { DbClient, QueryResult } from '../client.js';

export async function createPGliteClient(dataDir: string): Promise<DbClient> {
  await mkdir(dataDir, { recursive: true });
  const pglite = new PGlite(dataDir);
  let closed = false;

  function makeClient(
    queryFn: <T>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>,
    execFn: (sql: string) => Promise<void>,
    isTransaction = false
  ): DbClient {
    return {
      query: queryFn,
      exec: execFn,
      async close(): Promise<void> {
        if (isTransaction || closed) return;
        closed = true;
        await pglite.close();
      },
      async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
        if (isTransaction) {
          return fn(this);
        }
        return pglite.transaction(async (tx) => {
          const txClient = makeClient(
            async <T2>(sql: string, params?: unknown[]): Promise<QueryResult<T2>> => {
              const result = await tx.query<T2>(sql, params);
              return { rows: result.rows, affectedRows: result.affectedRows };
            },
            async (sql: string): Promise<void> => {
              await tx.exec(sql);
            },
            true
          );
          return fn(txClient);
        });
      },
    };
  }

  return makeClient(
    async <T>(sql: string, params?: unknown[]): Promise<QueryResult<T>> => {
      const result = await pglite.query<T>(sql, params);
      return { rows: result.rows, affectedRows: result.affectedRows };
    },
    async (sql: string): Promise<void> => {
      await pglite.exec(sql);
    }
  );
}
