import type { StorageDriver } from '../driver.js';
export interface S3StorageOptions {
    bucket: string;
    region?: string;
    endpoint?: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicUrl?: string;
    prefix?: string;
}
export declare function createS3Storage(options: S3StorageOptions): StorageDriver;
//# sourceMappingURL=s3.d.ts.map