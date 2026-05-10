import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadCmsConfig } from './load-config.js';
import { emitTypes } from './emit-types.js';
import { emitClient } from './emit-client.js';

export interface CodegenOptions {
  configPath?: string;
  outDir?: string;
  cwd?: string;
}

export interface CodegenResult {
  typesPath: string;
  clientPath: string;
}

export async function codegen(opts: CodegenOptions = {}): Promise<CodegenResult> {
  const cwd = opts.cwd ?? process.cwd();
  const configPath = resolve(cwd, opts.configPath ?? 'content.config.ts');
  const outDir = resolve(cwd, opts.outDir ?? '.infernocms-next');

  const config = await loadCmsConfig(configPath);
  const typesSrc = emitTypes(config);
  const clientSrc = emitClient();

  await mkdir(outDir, { recursive: true });
  const typesPath = resolve(outDir, 'types.ts');
  const clientPath = resolve(outDir, 'client.ts');
  await writeFile(typesPath, typesSrc, 'utf-8');
  await writeFile(clientPath, clientSrc, 'utf-8');

  return { typesPath, clientPath };
}

export { emitTypes } from './emit-types.js';
export { emitClient } from './emit-client.js';
export { loadCmsConfig } from './load-config.js';
