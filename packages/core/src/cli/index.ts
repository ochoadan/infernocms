#!/usr/bin/env node
import { cac } from 'cac';
import { dev } from './commands/dev.js';
import { start } from './commands/start.js';
import { generateTypes } from './commands/generate-types.js';

const cli = cac('infernocms');

cli
  .command('dev', 'Start development server')
  .option('-p, --port <port>', 'Port to listen on', { default: 4000 })
  .option('-c, --config <path>', 'Path to config file', { default: 'content.config.ts' })
  .option('--dry-run', 'Log planned migration operations without executing')
  .action(async (options) => {
    try {
      await dev({
        port: typeof options.port === 'string' ? parseInt(options.port, 10) : options.port,
        config: options.config,
        dryRun: options.dryRun,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

cli
  .command('start', 'Start production server (requires DATABASE_URL)')
  .option('-p, --port <port>', 'Port to listen on', { default: 4000 })
  .option('-c, --config <path>', 'Path to config file', { default: 'content.config.ts' })
  .option('--dry-run', 'Log planned migration operations without executing')
  .action(async (options) => {
    try {
      await start({
        port: typeof options.port === 'string' ? parseInt(options.port, 10) : options.port,
        config: options.config,
        dryRun: options.dryRun,
      });
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

cli
  .command('generate types', 'Generate TypeScript types from config')
  .option('-c, --config <path>', 'Path to config file', { default: 'content.config.ts' })
  .option('-o, --output <path>', 'Output file path', { default: '.infernocms/types.ts' })
  .action(async (options) => {
    try {
      const outputPath = await generateTypes({
        config: options.config,
        output: options.output,
      });
      console.log(`Types generated: ${outputPath}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

cli.help();
cli.version('0.0.1');

cli.parse();
