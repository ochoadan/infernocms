import { appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { mintToken, hashToken, generateToken, adminTokenCount, TOKEN_PREFIX } from './tokens.js';
export async function runBootstrap(db, opts = {}) {
    const cwd = opts.cwd ?? process.cwd();
    const log = opts.log ?? ((l) => console.log(l));
    const envToken = process.env.INFERNOCMS_BOOTSTRAP_TOKEN;
    if (envToken) {
        if (!envToken.startsWith(TOKEN_PREFIX)) {
            throw new Error(`INFERNOCMS_BOOTSTRAP_TOKEN must start with "${TOKEN_PREFIX}" prefix`);
        }
        const hash = hashToken(envToken);
        const existing = await db.query(`SELECT id FROM "_infernocms_tokens" WHERE token_hash = $1 AND revoked_at IS NULL`, [hash]);
        if (existing.rows.length > 0)
            return; // idempotent
        await mintToken(db, { name: 'bootstrap', scope: 'admin', plaintext: envToken });
        return;
    }
    if ((await adminTokenCount(db)) > 0)
        return;
    const plaintext = generateToken();
    await mintToken(db, { name: 'bootstrap', scope: 'admin', plaintext });
    const banner = '\n' +
        '═══════════════════════════════════════════════════════════════════\n' +
        '  InfernoCMS bootstrap admin token (save this — shown once)\n' +
        '  ' + plaintext + '\n' +
        '═══════════════════════════════════════════════════════════════════\n';
    log(banner);
    const envPath = join(cwd, '.env');
    if (existsSync(envPath)) {
        appendFileSync(envPath, `\nINFERNOCMS_BOOTSTRAP_TOKEN=${plaintext}\n`);
        log(`Wrote token to ${envPath}`);
    }
}
//# sourceMappingURL=bootstrap.js.map