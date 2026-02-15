import type { DbClient } from './client.js';
export interface ConnectionOptions {
    dataDir?: string;
    databaseUrl?: string;
}
export declare function createConnection(options?: ConnectionOptions): Promise<DbClient>;
export declare function getDb(): DbClient;
export declare function closeConnection(): Promise<void>;
//# sourceMappingURL=connection.d.ts.map