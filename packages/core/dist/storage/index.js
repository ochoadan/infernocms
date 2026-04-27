import { createLocalStorage } from './drivers/local.js';
let storageInstance = null;
export async function initStorage(config) {
    if (storageInstance)
        return storageInstance;
    if (!config || config.provider === 'local') {
        storageInstance = createLocalStorage({ uploadDir: config?.uploadDir });
    }
    else if (config.provider === 's3') {
        const { createS3Storage } = await import('./drivers/s3.js');
        storageInstance = createS3Storage({
            bucket: config.bucket,
            region: config.region,
            endpoint: config.endpoint,
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
            publicUrl: config.publicUrl,
            prefix: config.prefix,
        });
    }
    return storageInstance;
}
export function getStorage() {
    if (!storageInstance) {
        storageInstance = createLocalStorage();
    }
    return storageInstance;
}
//# sourceMappingURL=index.js.map