import { loadConfig, parseConfig } from 'infernocms';
import type { NormalizedConfig } from 'infernocms';

export async function loadCmsConfig(configPath: string): Promise<NormalizedConfig> {
  const raw = await loadConfig(configPath);
  return parseConfig(raw);
}
