import { describe, it, expect } from 'vitest';
import { valuesEqual, onlySilentFieldsChanged } from './content-service.js';
import type { NormalizedCollectionConfig } from '../config/types.js';

describe('valuesEqual', () => {
  it('returns true for identical primitives', () => {
    expect(valuesEqual(1, 1)).toBe(true);
    expect(valuesEqual('a', 'a')).toBe(true);
    expect(valuesEqual(true, true)).toBe(true);
  });

  it('returns true for both null/undefined', () => {
    expect(valuesEqual(null, null)).toBe(true);
    expect(valuesEqual(undefined, undefined)).toBe(true);
    expect(valuesEqual(null, undefined)).toBe(true);
    expect(valuesEqual(undefined, null)).toBe(true);
  });

  it('returns false when one is null and other is a value', () => {
    expect(valuesEqual(null, 1)).toBe(false);
    expect(valuesEqual('a', null)).toBe(false);
  });

  it('returns true for equivalent objects via JSON', () => {
    expect(valuesEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(valuesEqual([1, 2], [1, 2])).toBe(true);
  });

  it('returns false for different objects', () => {
    expect(valuesEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(valuesEqual([1], [2])).toBe(false);
  });
});

describe('onlySilentFieldsChanged', () => {
  const collection: NormalizedCollectionConfig = {
    name: 'posts',
    fields: {
      title: { type: 'text', required: true, silent: false },
      viewCount: { type: 'number', required: false, silent: true },
      sortOrder: { type: 'number', required: false, silent: true },
    },
    timestamps: {
      createdAt: { enabled: true, required: false },
      updatedAt: { enabled: true, required: false },
    },
  };

  it('returns true when only silent fields differ', () => {
    const existing = { title: 'Hello', viewCount: 5, sortOrder: 1 };
    const cleaned = { viewCount: 10 };
    expect(onlySilentFieldsChanged(collection, existing, cleaned)).toBe(true);
  });

  it('returns false when any non-silent field differs', () => {
    const existing = { title: 'Hello', viewCount: 5 };
    const cleaned = { title: 'World', viewCount: 10 };
    expect(onlySilentFieldsChanged(collection, existing, cleaned)).toBe(false);
  });

  it('returns true when no fields actually changed (values equal)', () => {
    const existing = { title: 'Hello', viewCount: 5 };
    const cleaned = { title: 'Hello', viewCount: 5 };
    expect(onlySilentFieldsChanged(collection, existing, cleaned)).toBe(true);
  });

  it('returns true when cleaned is empty', () => {
    const existing = { title: 'Hello' };
    const cleaned = {};
    expect(onlySilentFieldsChanged(collection, existing, cleaned)).toBe(true);
  });

  it('returns false when a non-silent field changes from undefined', () => {
    const existing = {};
    const cleaned = { title: 'New' };
    expect(onlySilentFieldsChanged(collection, existing, cleaned)).toBe(false);
  });

  it('ignores fields not in the collection schema', () => {
    const existing = { title: 'Hello', unknownField: 'old' };
    const cleaned = { unknownField: 'new' } as Record<string, unknown>;
    expect(onlySilentFieldsChanged(collection, existing, cleaned)).toBe(true);
  });
});
