import { existsSync, mkdirSync } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
export function createLocalStorage(options = {}) {
    const uploadDir = options.uploadDir ?? join(process.cwd(), 'uploads');
    if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
    }
    return {
        async upload(filename, buffer, _contentType) {
            const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
            const filePath = join(uploadDir, safeName);
            await writeFile(filePath, buffer);
            return `/uploads/${safeName}`;
        },
        async delete(url) {
            const name = url.split('/').pop();
            if (name) {
                const resolved = resolve(join(uploadDir, name));
                const base = resolve(uploadDir);
                if (!resolved.startsWith(base + sep) && resolved !== base)
                    return;
                try {
                    await unlink(resolved);
                }
                catch {
                    // File may not exist
                }
            }
        },
    };
}
//# sourceMappingURL=local.js.map