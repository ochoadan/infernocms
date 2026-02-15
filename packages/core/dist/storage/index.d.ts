import type { StorageDriver } from './driver.js';
export type { StorageDriver } from './driver.js';
export interface StorageConfig {
    provider?: 'local' | 's3';
    uploadDir?: string;
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicUrl?: string;
    prefix?: string;
}
export declare function initStorage(config?: StorageConfig): Promise<StorageDriver>;
export declare function getStorage(): StorageDriver;
//# sourceMappingURL=index.d.ts.map