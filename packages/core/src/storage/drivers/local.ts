import { existsSync, mkdirSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { StorageDriver } from '../driver.js';

export interface LocalStorageOptions {
  uploadDir?: string;
}

export function createLocalStorage(options: LocalStorageOptions = {}): StorageDriver {
  const uploadDir = options.uploadDir ?? join(process.cwd(), 'uploads');

  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }

  return {
    async upload(filename: string, buffer: Buffer, _contentType: string): Promise<string> {
      const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = join(uploadDir, safeName);
      await writeFile(filePath, buffer);
      return `/uploads/${safeName}`;
    },
    async delete(url: string): Promise<void> {
      const name = url.split('/').pop();
      if (name) {
        try {
          await unlink(join(uploadDir, name));
        } catch {
          // File may not exist
        }
      }
    },
  };
}
