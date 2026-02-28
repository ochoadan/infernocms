import type { NormalizedConfig } from '../config/types.js';
import type { DbClient } from './client.js';
import { type MigrationOp } from './schema-diff.js';
export interface SyncOptions {
    force?: boolean;
    dryRun?: boolean;
    db?: DbClient;
}
export declare function getTableInfo(tableName: string, db?: DbClient): Promise<{
    exists: boolean;
    columns: string[];
}>;
export declare function syncTables(config: NormalizedConfig, options?: SyncOptions): Promise<MigrationOp[]>;
//# sourceMappingURL=migrator.d.ts.map