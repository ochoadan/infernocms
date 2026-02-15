import type { DbClient } from './client.js';

let dbClient: DbClient | null = null;

export interface ConnectionOptions {
  dataDir?: string;
  databaseUrl?: string;
}

export async function createConnection(
  options: ConnectionOptions = {}
): Promise<DbClient> {
  if (dbClient) return dbClient;

  const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;

  if (databaseUrl) {
    const { createPostgresClient } = await import('./drivers/postgres.js');
    dbClient = await createPostgresClient(databaseUrl);
  } else {
    const { createPGliteClient } = await import('./drivers/pglite.js');
    const dataDir = options.dataDir ?? '.infernocms/data';
    dbClient = await createPGliteClient(dataDir);
  }

  return dbClient;
}

export function getDb(): DbClient {
  if (!dbClient) {
    throw new Error('Database not connected. Call createConnection first.');
  }
  return dbClient;
}

export async function closeConnection(): Promise<void> {
  if (dbClient) {
    await dbClient.close();
    dbClient = null;
  }
}
