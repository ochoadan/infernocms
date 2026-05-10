#!/usr/bin/env node
import { cac } from 'cac';
import { watch as fsWatch } from 'node:fs';
import { resolve } from 'node:path';
import { codegen } from './codegen/index.js';

const cli = cac('infernocms-next');

cli
  .command('codegen', 'Read content.config.ts and emit types + client into .infernocms-next/')
  .option('--config <path>', 'Path to content.config.ts', { default: 'content.config.ts' })
  .option('--out <dir>', 'Output directory', { default: '.infernocms-next' })
  .action(async (opts: { config: string; out: string }) => {
    try {
      const result = await codegen({ configPath: opts.config, outDir: opts.out });
      console.log(`Wrote ${result.typesPath}`);
      console.log(`Wrote ${result.clientPath}`);
    } catch (err) {
      console.error(`codegen failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  });

cli
  .command('watch', 'Run codegen on every change to content.config.ts')
  .option('--config <path>', 'Path to content.config.ts', { default: 'content.config.ts' })
  .option('--out <dir>', 'Output directory', { default: '.infernocms-next' })
  .action(async (opts: { config: string; out: string }) => {
    const cwd = process.cwd();
    const configAbs = resolve(cwd, opts.config);

    async function run(): Promise<void> {
      try {
        const result = await codegen({ configPath: opts.config, outDir: opts.out });
        const ts = new Date().toLocaleTimeString();
        console.log(`[${ts}] codegen → ${result.typesPath}, ${result.clientPath}`);
      } catch (err) {
        console.error(`codegen failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    await run();

    let debounce: NodeJS.Timeout | null = null;
    fsWatch(configAbs, () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        void run();
      }, 250);
    });

    console.log(`Watching ${configAbs}`);
  });

cli.help();
cli.parse();
