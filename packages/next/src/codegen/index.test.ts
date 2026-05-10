import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { codegen } from './index.js';

describe('codegen', () => {
  let tmpCwd: string;

  beforeEach(() => {
    tmpCwd = mkdtempSync(join(tmpdir(), 'icms-next-codegen-'));
  });

  afterEach(() => {
    rmSync(tmpCwd, { recursive: true, force: true });
  });

  it('writes types.ts and client.ts to the out dir', async () => {
    // Use shorthand string fields so the config has no imports —
    // tmp dirs don't have node_modules and jiti can't resolve `infernocms`.
    writeFileSync(
      join(tmpCwd, 'content.config.ts'),
      `export default {
  collections: {
    posts: {
      fields: {
        title: 'text!',
        slug: 'slug:title',
      },
    },
  },
};
`
    );

    const result = await codegen({ cwd: tmpCwd });
    expect(result.typesPath.endsWith('types.ts')).toBe(true);
    expect(result.clientPath.endsWith('client.ts')).toBe(true);

    const types = readFileSync(result.typesPath, 'utf-8');
    expect(types).toContain('export interface Posts');
    expect(types).toContain("export type SlugCollection = 'posts';");

    const client = readFileSync(result.clientPath, 'utf-8');
    expect(client).toContain('export const cms');
    expect(client).toContain('export const writeCms');
  });

  it('honors a custom outDir', async () => {
    writeFileSync(
      join(tmpCwd, 'content.config.ts'),
      `export default {
  collections: { authors: { fields: { name: 'text!' } } },
};
`
    );
    const result = await codegen({ cwd: tmpCwd, outDir: 'cms-types' });
    expect(result.typesPath).toContain('cms-types');
    expect(result.clientPath).toContain('cms-types');
  });
});
