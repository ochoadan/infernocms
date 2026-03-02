import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
export async function createPGliteClient(dataDir) {
    await mkdir(dataDir, { recursive: true });
    const pglite = new PGlite(dataDir);
    let closed = false;
    function makeClient(queryFn, execFn, isTransaction = false) {
        return {
            query: queryFn,
            exec: execFn,
            async close() {
                if (isTransaction || closed)
                    return;
                closed = true;
                await pglite.close();
            },
            async transaction(fn) {
                if (isTransaction) {
                    return fn(this);
                }
                return pglite.transaction(async (tx) => {
                    const txClient = makeClient(async (sql, params) => {
                        const result = await tx.query(sql, params);
                        return { rows: result.rows, affectedRows: result.affectedRows };
                    }, async (sql) => {
                        await tx.exec(sql);
                    }, true);
                    return fn(txClient);
                });
            },
        };
    }
    return makeClient(async (sql, params) => {
        const result = await pglite.query(sql, params);
        return { rows: result.rows, affectedRows: result.affectedRows };
    }, async (sql) => {
        await pglite.exec(sql);
    });
}
//# sourceMappingURL=pglite.js.map