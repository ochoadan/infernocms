import { describe, it, expect } from 'vitest';
import { emitClient } from './emit-client.js';

describe('emitClient', () => {
  it('emits cms and writeCms exports', () => {
    const out = emitClient();
    expect(out).toContain('export const cms = createReadClient<Schema, SlugCollection>');
    expect(out).toContain('export const writeCms = createWriteClientFactory<Schema, SlugCollection>');
  });

  it('imports from @infernocms/next/runtime', () => {
    expect(emitClient()).toContain(
      "from '@infernocms/next/runtime'"
    );
  });

  it('reads url and read token from process.env', () => {
    const out = emitClient();
    expect(out).toContain('process.env.INFERNOCMS_URL');
    expect(out).toContain('process.env.INFERNOCMS_READ_TOKEN');
  });

  it('contains a do-not-edit banner', () => {
    expect(emitClient()).toContain('AUTO-GENERATED');
  });
});
