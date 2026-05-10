import { resolve, dirname } from 'node:path';
import { existsSync, statSync, watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadConfig, parseConfig, createConnection, syncTables, createServer, startServer, getEndpointList, initStorage, extractHooks, extractAccess, AppContext, } from '../../index.js';
import { ensureSystemTables } from '../../auth/system-tables.js';
import { runBootstrap } from '../../auth/bootstrap.js';
import { generateTypes } from './generate-types.js';
export async function dev(options = {}) {
    const port = options.port ?? 4000;
    const adminPort = options.adminPort ?? 4001;
    const configPath = resolve(process.cwd(), options.config ?? 'content.config.ts');
    const launchAdmin = options.admin !== false;
    console.log('InfernoCMS Dev Server\n');
    console.log(`Loading config from: ${configPath}`);
    let rawConfig = await loadConfig(configPath);
    let config = parseConfig(rawConfig);
    const collectionNames = Object.keys(config.collections);
    console.log(`Found ${collectionNames.length} collection(s): ${collectionNames.join(', ')}\n`);
    console.log('Initializing database...');
    const dataDir = resolve(process.cwd(), '.infernocms/data');
    const db = await createConnection({ dataDir });
    console.log('Ensuring system tables...');
    await ensureSystemTables(db);
    console.log('Running bootstrap...');
    await runBootstrap(db);
    console.log('Syncing tables...');
    await syncTables(config, { force: true, dryRun: options.dryRun, db });
    const storage = config.storage ? await initStorage(config.storage) : undefined;
    let ctx = new AppContext({ db, config, storage });
    // Auto-generate types
    try {
        const typesPath = await generateTypes({ config: options.config });
        console.log(`Types generated: ${typesPath}`);
    }
    catch {
        // Non-fatal — types generation is optional
    }
    console.log('Starting API server...\n');
    let app = await createServer(config, {
        logger: false,
        hooks: extractHooks(rawConfig),
        access: extractAccess(rawConfig),
        webhooks: rawConfig.webhooks,
        db,
        ctx,
    });
    await startServer(app, { port });
    console.log(`API Server: http://localhost:${port}`);
    const endpoints = getEndpointList(config);
    console.log('\nAvailable endpoints:');
    for (const endpoint of endpoints) {
        console.log(`  ${endpoint}`);
    }
    // Spawn admin UI process
    let adminProcess = null;
    if (launchAdmin) {
        console.log('\nStarting admin UI...');
        adminProcess = spawnAdmin(adminPort, port);
        if (adminProcess) {
            console.log(`Admin UI:   http://localhost:${adminPort}\n`);
        }
        else {
            console.log('Admin UI:   Not available — admin is preview-only in 0.1.0');
            console.log('            For the admin preview, clone https://github.com/ochoadan/infernocms');
            console.log('            and run `pnpm dev` from the monorepo root.');
            console.log('            (Re-run with --no-admin to silence this message.)\n');
        }
    }
    else {
        console.log('\nAdmin UI:   Disabled (--no-admin)\n');
    }
    // Config hot-reload watcher
    let reloading = false;
    let debounceTimer = null;
    watch(configPath, () => {
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (reloading)
                return;
            reloading = true;
            try {
                console.log('\n[reload] Config changed, reloading...');
                // 1. Load fresh config
                const newRawConfig = await loadConfig(configPath);
                const newConfig = parseConfig(newRawConfig);
                // 2. Sync tables with new schema (force in dev)
                await syncTables(newConfig, { force: true, db });
                // 3. Clear cached repositories (stale schema)
                ctx.clearRepositories();
                // 4. Shut down old Fastify instance
                await app.close();
                // 5. Create new context + server with new config
                ctx = new AppContext({ db, config: newConfig, storage });
                app = await createServer(newConfig, {
                    logger: false,
                    hooks: extractHooks(newRawConfig),
                    access: extractAccess(newRawConfig),
                    webhooks: newRawConfig.webhooks,
                    db,
                    ctx,
                });
                await startServer(app, { port });
                // 6. Regenerate types
                try {
                    await generateTypes({ config: options.config });
                }
                catch {
                    // Non-fatal
                }
                // Update references
                rawConfig = newRawConfig;
                config = newConfig;
                const newEndpoints = getEndpointList(newConfig);
                console.log('[reload] Reload complete. Endpoints:');
                for (const endpoint of newEndpoints) {
                    console.log(`  ${endpoint}`);
                }
                console.log('');
            }
            catch (err) {
                console.error('[reload] Error reloading config:', err instanceof Error ? err.message : err);
                console.error('[reload] Keeping previous server running.\n');
            }
            finally {
                reloading = false;
            }
        }, 500);
    });
    console.log('Watching config for changes...');
    console.log('Press Ctrl+C to stop\n');
    // Graceful shutdown
    const shutdown = () => {
        console.log('\nShutting down...');
        if (adminProcess) {
            adminProcess.kill('SIGTERM');
        }
        app.close().then(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
function findAdminDir() {
    // Try resolving the @infernocms/admin package via createRequire
    try {
        const require = createRequire(import.meta.url);
        const adminPkgPath = require.resolve('@infernocms/admin/package.json');
        return dirname(adminPkgPath);
    }
    catch {
        // Fall through to monorepo detection
    }
    // Try relative monorepo path
    const monorepoPath = resolve(process.cwd(), 'packages/admin');
    if (existsSync(monorepoPath) && statSync(monorepoPath).isDirectory()) {
        return monorepoPath;
    }
    return null;
}
function spawnAdmin(adminPort, apiPort) {
    const adminDir = findAdminDir();
    if (!adminDir)
        return null;
    const child = spawn('npx', ['next', 'dev', '-p', String(adminPort)], {
        cwd: adminDir,
        stdio: 'pipe',
        shell: true,
        env: {
            ...process.env,
            INFERNOCMS_API_URL: `http://localhost:${apiPort}`,
        },
    });
    child.stdout?.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
            if (line.trim())
                console.log(`[admin] ${line}`);
        }
    });
    child.stderr?.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        for (const line of lines) {
            if (line.trim())
                console.log(`[admin] ${line}`);
        }
    });
    child.on('error', (err) => {
        console.error(`[admin] Failed to start: ${err.message}`);
    });
    return child;
}
//# sourceMappingURL=dev.js.map