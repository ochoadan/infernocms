import { resolve, dirname } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  loadConfig,
  parseConfig,
  createConnection,
  syncTables,
  createServer,
  startServer,
  getEndpointList,
  initStorage,
  extractHooks,
  extractAccess,
} from 'infernocms';
import { generateTypes } from './generate-types.js';

export interface DevOptions {
  port?: number;
  adminPort?: number;
  config?: string;
  admin?: boolean;
}

export async function dev(options: DevOptions = {}): Promise<void> {
  const port = options.port ?? 4000;
  const adminPort = options.adminPort ?? 4001;
  const configPath = resolve(process.cwd(), options.config ?? 'content.config.ts');
  const launchAdmin = options.admin !== false;

  console.log('InfernoCMS Dev Server\n');
  console.log(`Loading config from: ${configPath}`);

  const rawConfig = await loadConfig(configPath);
  const config = parseConfig(rawConfig);

  const hooks = extractHooks(rawConfig);
  const access = extractAccess(rawConfig);

  const collectionNames = Object.keys(config.collections);
  console.log(`Found ${collectionNames.length} collection(s): ${collectionNames.join(', ')}\n`);

  console.log('Initializing database...');
  const dataDir = resolve(process.cwd(), '.infernocms/data');
  await createConnection({ dataDir });

  console.log('Syncing tables...');
  await syncTables(config);

  if (config.storage) {
    await initStorage(config.storage);
  }

  // Auto-generate types
  try {
    const typesPath = await generateTypes({ config: options.config });
    console.log(`Types generated: ${typesPath}`);
  } catch {
    // Non-fatal — types generation is optional
  }

  console.log('Starting API server...\n');
  const app = await createServer(config, {
    logger: false,
    hooks,
    access,
    auth: rawConfig.auth,
  });
  await startServer(app, { port });

  console.log(`API Server: http://localhost:${port}`);

  const endpoints = getEndpointList(config);
  console.log('\nAvailable endpoints:');
  for (const endpoint of endpoints) {
    console.log(`  ${endpoint}`);
  }

  // Spawn admin UI process
  let adminProcess: ChildProcess | null = null;

  if (launchAdmin) {
    console.log('\nStarting admin UI...');
    adminProcess = spawnAdmin(adminPort, port);

    if (adminProcess) {
      console.log(`Admin UI:   http://localhost:${adminPort}\n`);
    } else {
      console.log('Admin UI:   Could not locate @infernocms/admin package');
      console.log('            Run admin separately: cd packages/admin && pnpm dev\n');
    }
  } else {
    console.log('\nAdmin UI:   Disabled (--no-admin)\n');
  }

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

function findAdminDir(): string | null {
  // Try resolving the @infernocms/admin package via createRequire
  try {
    const require = createRequire(import.meta.url);
    const adminPkgPath = require.resolve('@infernocms/admin/package.json');
    return dirname(adminPkgPath);
  } catch {
    // Fall through to monorepo detection
  }

  // Try relative monorepo path
  const monorepoPath = resolve(process.cwd(), 'packages/admin');
  if (existsSync(monorepoPath) && statSync(monorepoPath).isDirectory()) {
    return monorepoPath;
  }

  return null;
}

function spawnAdmin(adminPort: number, apiPort: number): ChildProcess | null {
  const adminDir = findAdminDir();
  if (!adminDir) return null;

  const child = spawn('npx', ['next', 'dev', '-p', String(adminPort)], {
    cwd: adminDir,
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      INFERNOCMS_API_URL: `http://localhost:${apiPort}`,
    },
  });

  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`[admin] ${line}`);
    }
  });

  child.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) console.log(`[admin] ${line}`);
    }
  });

  child.on('error', (err) => {
    console.error(`[admin] Failed to start: ${err.message}`);
  });

  return child;
}
