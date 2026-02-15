import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { InfernoCMSConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadConfig(configPath: string): Promise<InfernoCMSConfig> {
  const jiti = createJiti(__dirname, {
    interopDefault: true,
  });

  const loaded = await jiti.import(configPath);
  const config = (loaded as { default?: InfernoCMSConfig }).default ?? loaded;

  if (!config || typeof config !== 'object') {
    throw new Error(`Invalid config file: ${configPath}`);
  }

  if (!('collections' in config)) {
    throw new Error('Config must have a "collections" property');
  }

  return config as InfernoCMSConfig;
}
