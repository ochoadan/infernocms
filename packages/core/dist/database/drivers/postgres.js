import postgres from 'postgres';
export async function createPostgresClient(connectionString) {
    const sql = postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
    });
    // Test connection
    await sql `SELECT 1`;
    function makeClient(unsafeFn, isTransaction = false) {
        return {
            async query(sqlText, params) {
                const result = await unsafeFn(sqlText, params);
                return {
                    rows: result,
                    affectedRows: result.count,
                };
            },
            async exec(sqlText) {
                await unsafeFn(sqlText);
            },
            async close() {
                await sql.end();
            },
            async transaction(fn) {
                if (isTransaction) {
                    return fn(this);
                }
                return sql.begin(async (txSql) => {
                    const txClient = makeClient((text, params) => txSql.unsafe(text, params), true);
                    return fn(txClient);
                });
            },
        };
    }
    return makeClient((sqlText, params) => sql.unsafe(sqlText, params));
}
//# sourceMappingURL=postgres.js.map