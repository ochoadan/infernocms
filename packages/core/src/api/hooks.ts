import type { InfernoCMSConfig, CollectionHooks } from '../config/types.js';

export type HooksMap = Record<string, CollectionHooks>;

export function extractHooks(config: InfernoCMSConfig): HooksMap {
  const hooks: HooksMap = {};

  for (const [name, collection] of Object.entries(config.collections)) {
    if (collection.hooks) {
      hooks[name] = collection.hooks;
    }
  }

  return hooks;
}
