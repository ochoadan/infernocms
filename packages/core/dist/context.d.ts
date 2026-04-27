import type { DbClient } from './database/client.js';
import type { NormalizedConfig, NormalizedCollectionConfig } from './config/types.js';
import type { StorageDriver } from './storage/driver.js';
import { Repository } from './database/repository.js';
export declare class AppContext {
    readonly db: DbClient;
    readonly config: NormalizedConfig;
    readonly storage: StorageDriver | null;
    private repositories;
    constructor(opts: {
        db: DbClient;
        config: NormalizedConfig;
        storage?: StorageDriver;
    });
    getRepository(collection: NormalizedCollectionConfig): Repository;
    clearRepositories(): void;
}
//# sourceMappingURL=context.d.ts.map