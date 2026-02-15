import { PGlite } from '@electric-sql/pglite';
import { mkdir } from 'node:fs/promises';
export async function createPGliteClient(dataDir) {
    await mkdir(dataDir, { recursive: true });
    const pglite = new PGlite(dataDir);
    return {
        async query(sql, params) {
            const result = await pglite.query(sql, params);
            return { rows: result.rows, affectedRows: result.affectedRows };
        },
        async exec(sql) {
            await pglite.exec(sql);
        },
        async close() {
            await pglite.close();
        },
    };
}
//# sourceMappingURL=pglite.js.map