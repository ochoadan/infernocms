export interface StorageDriver {
  upload(filename: string, buffer: Buffer, contentType: string): Promise<string>;
  delete(url: string): Promise<void>;
}
