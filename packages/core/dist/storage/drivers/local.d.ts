import type { StorageDriver } from '../driver.js';
export interface LocalStorageOptions {
    uploadDir?: string;
}
export declare function createLocalStorage(options?: LocalStorageOptions): StorageDriver;
//# sourceMappingURL=local.d.ts.map