import type { DbClient } from './database/client.js';
import type { NormalizedConfig, NormalizedCollectionConfig } from './config/types.js';
import type { StorageDriver } from './storage/driver.js';
import { Repository } from './database/repository.js';

export class AppContext {
  readonly db: DbClient;
  readonly config: NormalizedConfig;
  readonly storage: StorageDriver | null;
  private repositories = new Map<string, Repository>();

  constructor(opts: { db: DbClient; config: NormalizedConfig; storage?: StorageDriver }) {
    this.db = opts.db;
    this.config = opts.config;
    this.storage = opts.storage ?? null;
  }

  getRepository(collection: NormalizedCollectionConfig): Repository {
    const key = collection.name;
    let repo = this.repositories.get(key);
    if (!repo) {
      repo = new Repository(collection, this.config, this.db);
      this.repositories.set(key, repo);
    }
    return repo;
  }

  clearRepositories(): void {
    this.repositories.clear();
  }
}
