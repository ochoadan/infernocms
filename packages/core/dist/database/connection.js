let dbClient = null;
export async function createConnection(options = {}) {
    if (dbClient)
        return dbClient;
    const databaseUrl = options.databaseUrl ?? process.env.DATABASE_URL;
    if (databaseUrl) {
        const { createPostgresClient } = await import('./drivers/postgres.js');
        dbClient = await createPostgresClient(databaseUrl);
    }
    else {
        const { createPGliteClient } = await import('./drivers/pglite.js');
        const dataDir = options.dataDir ?? '.infernocms/data';
        dbClient = await createPGliteClient(dataDir);
    }
    return dbClient;
}
export function getDb() {
    if (!dbClient) {
        throw new Error('Database not connected. Call createConnection first.');
    }
    return dbClient;
}
export async function closeConnection() {
    if (dbClient) {
        await dbClient.close();
        dbClient = null;
    }
}
//# sourceMappingURL=connection.js.map