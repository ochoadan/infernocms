import { resolve } from 'node:path';
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
  AppContext,
} from '../../index.js';

export interface StartOptions {
  port?: number;
  config?: string;
  dryRun?: boolean;
}

export async function start(options: StartOptions = {}): Promise<void> {
  const port = options.port ?? (Number(process.env.PORT) || 4000);
  const configPath = resolve(process.cwd(), options.config ?? 'content.config.ts');

  console.log('InfernoCMS Production Server\n');
  console.log(`Loading config from: ${configPath}`);

  const rawConfig = await loadConfig(configPath);
  const config = parseConfig(rawConfig);

  const hooks = extractHooks(rawConfig);
  const access = extractAccess(rawConfig);

  const collectionNames = Object.keys(config.collections);
  console.log(`Found ${collectionNames.length} collection(s): ${collectionNames.join(', ')}\n`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is required in production mode.');
    console.error('Set DATABASE_URL to your PostgreSQL connection string.');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const db = await createConnection({ databaseUrl });

  console.log('Syncing tables...');
  await syncTables(config, { force: false, dryRun: options.dryRun, db });

  const storage = config.storage ? await initStorage(config.storage) : undefined;

  const ctx = new AppContext({ db, config, storage });

  console.log('Starting server...\n');
  const app = await createServer(config, {
    logger: true,
    hooks,
    access,
    auth: rawConfig.auth,
    webhooks: rawConfig.webhooks,
    ctx,
  });
  await startServer(app, { port });

  console.log(`Server listening on http://0.0.0.0:${port}`);

  const endpoints = getEndpointList(config);
  console.log('\nAvailable endpoints:');
  for (const endpoint of endpoints) {
    console.log(`  ${endpoint}`);
  }

  console.log('\nPress Ctrl+C to stop\n');

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    app.close().then(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
