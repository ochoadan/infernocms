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
