import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
export function createS3Storage(options) {
    const client = new S3Client({
        region: options.region ?? 'auto',
        endpoint: options.endpoint,
        credentials: {
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey,
        },
        forcePathStyle: !!options.endpoint,
    });
    const prefix = options.prefix ?? 'uploads/';
    function buildUrl(key) {
        if (options.publicUrl) {
            return `${options.publicUrl.replace(/\/$/, '')}/${key}`;
        }
        return `https://${options.bucket}.s3.${options.region ?? 'us-east-1'}.amazonaws.com/${key}`;
    }
    return {
        async upload(filename, buffer, contentType) {
            const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const key = `${prefix}${safeName}`;
            await client.send(new PutObjectCommand({
                Bucket: options.bucket,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            }));
            return buildUrl(key);
        },
        async delete(url) {
            const key = url.includes(prefix)
                ? url.substring(url.indexOf(prefix))
                : `${prefix}${url.split('/').pop()}`;
            await client.send(new DeleteObjectCommand({
                Bucket: options.bucket,
                Key: key,
            }));
        },
    };
}
//# sourceMappingURL=s3.js.map