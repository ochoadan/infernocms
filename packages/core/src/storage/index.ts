import type { StorageDriver } from './driver.js';
import { createLocalStorage } from './drivers/local.js';

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

let storageInstance: StorageDriver | null = null;

export async function initStorage(config?: StorageConfig): Promise<StorageDriver> {
  if (storageInstance) return storageInstance;

  if (!config || config.provider === 'local') {
    storageInstance = createLocalStorage({ uploadDir: config?.uploadDir });
  } else if (config.provider === 's3') {
    const { createS3Storage } = await import('./drivers/s3.js');
    storageInstance = createS3Storage({
      bucket: config.bucket!,
      region: config.region,
      endpoint: config.endpoint,
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
      publicUrl: config.publicUrl,
      prefix: config.prefix,
    });
  }

  return storageInstance!;
}

export function getStorage(): StorageDriver {
  if (!storageInstance) {
    storageInstance = createLocalStorage();
  }
  return storageInstance;
}
