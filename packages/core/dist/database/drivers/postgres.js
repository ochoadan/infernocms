import postgres from 'postgres';
export async function createPostgresClient(connectionString) {
    const sql = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
    });
    // Test connection
    await sql `SELECT 1`;
    return {
        async query(sqlText, params) {
            const result = await sql.unsafe(sqlText, params);
            return {
                rows: result,
                affectedRows: result.count,
            };
        },
        async exec(sqlText) {
            await sql.unsafe(sqlText);
        },
        async close() {
            await sql.end();
        },
    };
}
//# sourceMappingURL=postgres.js.map