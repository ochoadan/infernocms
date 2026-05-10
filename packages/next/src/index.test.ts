import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('@infernocms/next', () => {
  it('exports a VERSION constant', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
