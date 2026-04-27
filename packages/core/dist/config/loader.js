import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export async function loadConfig(configPath) {
    // Create a fresh jiti instance each call to bypass module cache,
    // ensuring config hot-reload picks up changes.
    const jiti = createJiti(__dirname, {
        interopDefault: true,
        moduleCache: false,
    });
    const loaded = await jiti.import(configPath);
    const config = loaded.default ?? loaded;
    if (!config || typeof config !== 'object') {
        throw new Error(`Invalid config file: ${configPath}`);
    }
    if (!('collections' in config)) {
        throw new Error('Config must have a "collections" property');
    }
    return config;
}
//# sourceMappingURL=loader.js.map