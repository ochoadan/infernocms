import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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

export function createS3Storage(options: S3StorageOptions): StorageDriver {
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

  function buildUrl(key: string): string {
    if (options.publicUrl) {
      return `${options.publicUrl.replace(/\/$/, '')}/${key}`;
    }
    return `https://${options.bucket}.s3.${options.region ?? 'us-east-1'}.amazonaws.com/${key}`;
  }

  return {
    async upload(filename: string, buffer: Buffer, contentType: string): Promise<string> {
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
    async delete(url: string): Promise<void> {
      let key: string;
      if (url.includes(prefix)) {
        key = url.substring(url.indexOf(prefix));
      } else {
        const name = url.split('/').pop();
        if (!name) return;
        key = `${prefix}${name}`;
      }

      if (key.includes('..') || !key.startsWith(prefix)) return;

      await client.send(new DeleteObjectCommand({
        Bucket: options.bucket,
        Key: key,
      }));
    },
  };
}
