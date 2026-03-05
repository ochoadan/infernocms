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
  let closed = false;

  function makeClient(
    unsafeFn: (sqlText: string, params?: any[]) => postgres.PendingQuery<postgres.Row[]>,
    isTransaction = false
  ): DbClient {
    return {
      async query<T>(sqlText: string, params?: unknown[]): Promise<QueryResult<T>> {
        const result = await unsafeFn(sqlText, params as any[]);
        return {
          rows: result as unknown as T[],
          affectedRows: result.count,
        };
      },
      async exec(sqlText: string): Promise<void> {
        await unsafeFn(sqlText);
      },
      async close(): Promise<void> {
        if (isTransaction || closed) return;
        closed = true;
        await sql.end();
      },
      async transaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
        if (isTransaction) {
          return fn(this);
        }
        return sql.begin(async (txSql) => {
          const txClient = makeClient(
            (text: string, params?: any[]) => txSql.unsafe(text, params),
            true
          );
          return fn(txClient);
        }) as Promise<T>;
      },
    };
  }

  return makeClient((sqlText: string, params?: any[]) => sql.unsafe(sqlText, params));
}
