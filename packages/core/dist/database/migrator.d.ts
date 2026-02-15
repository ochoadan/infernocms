import type { NormalizedConfig } from '../config/types.js';
export declare function syncTables(config: NormalizedConfig): Promise<void>;
export declare function getTableInfo(tableName: string): Promise<{
    exists: boolean;
    columns: string[];
}>;
//# sourceMappingURL=migrator.d.ts.map