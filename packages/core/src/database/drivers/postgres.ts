import postgres from 'postgres';
import type { DbClient, QueryResult } from '../client.js';

export async function createPostgresClient(connectionString: string): Promise<DbClient> {
  const sql = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Test connection
  await sql`SELECT 1`;

  return {
    async query<T>(sqlText: string, params?: unknown[]): Promise<QueryResult<T>> {
      const result = await sql.unsafe(sqlText, params as any[]);
      return {
        rows: result as unknown as T[],
        affectedRows: result.count,
      };
    },
    async exec(sqlText: string): Promise<void> {
      await sql.unsafe(sqlText);
    },
    async close(): Promise<void> {
      await sql.end();
    },
  };
}
