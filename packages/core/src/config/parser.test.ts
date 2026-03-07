import { describe, it, expect } from 'vitest';
import { parseConfig } from './parser.js';
import type { InfernoCMSConfig } from './types.js';

describe('parseConfig — silent field option', () => {
  it('normalizes silent: true on a verbose field', () => {
    const config: InfernoCMSConfig = {
      collections: {
        posts: {
          fields: {
            viewCount: { type: 'number', silent: true },
          },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.posts.fields.viewCount.silent).toBe(true);
  });

  it('defaults silent to false on a verbose field', () => {
    const config: InfernoCMSConfig = {
      collections: {
        posts: {
          fields: {
            title: { type: 'text' },
          },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.posts.fields.title.silent).toBe(false);
  });

  it('defaults silent to false on shorthand fields', () => {
    const config: InfernoCMSConfig = {
      collections: {
        authors: {
          fields: { name: 'text!' },
        },
        posts: {
          fields: {
            title: 'text!',
            status: 'select:draft,published',
            slug: 'slug:title',
            author: 'rel:authors',
          },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.posts.fields.title.silent).toBe(false);
    expect(result.collections.posts.fields.status.silent).toBe(false);
    expect(result.collections.posts.fields.slug.silent).toBe(false);
    expect(result.collections.posts.fields.author.silent).toBe(false);
  });
});

describe('parseConfig — timestamps config', () => {
  it('defaults to both timestamps enabled and not required', () => {
    const config: InfernoCMSConfig = {
      collections: {
        posts: {
          fields: { title: 'text' },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.posts.timestamps).toEqual({
      createdAt: { enabled: true, required: false },
      updatedAt: { enabled: true, required: false },
    });
  });

  it('timestamps: false disables both', () => {
    const config: InfernoCMSConfig = {
      collections: {
        logs: {
          timestamps: false,
          fields: { message: 'text!' },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.logs.timestamps).toEqual({
      createdAt: { enabled: false, required: false },
      updatedAt: { enabled: false, required: false },
    });
  });

  it('timestamps object sets required on createdAt', () => {
    const config: InfernoCMSConfig = {
      collections: {
        audit: {
          timestamps: { createdAt: { required: true } },
          fields: { action: 'text!' },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.audit.timestamps).toEqual({
      createdAt: { enabled: true, required: true },
      updatedAt: { enabled: true, required: false },
    });
  });

  it('timestamps object sets required on updatedAt', () => {
    const config: InfernoCMSConfig = {
      collections: {
        audit: {
          timestamps: { updatedAt: { required: true } },
          fields: { action: 'text!' },
        },
      },
    };
    const result = parseConfig(config);
    expect(result.collections.audit.timestamps).toEqual({
      createdAt: { enabled: true, required: false },
      updatedAt: { enabled: true, required: true },
    });
  });
});

describe('parseConfig — reserved field names conditional on timestamps', () => {
  it('rejects createdAt field when timestamps enabled', () => {
    const config: InfernoCMSConfig = {
      collections: {
        posts: {
          fields: { createdAt: 'text' },
        },
      },
    };
    expect(() => parseConfig(config)).toThrow(/reserved/i);
  });

  it('allows createdAt field when timestamps disabled', () => {
    const config: InfernoCMSConfig = {
      collections: {
        logs: {
          timestamps: false,
          fields: { createdAt: 'text' },
        },
      },
    };
    expect(() => parseConfig(config)).not.toThrow();
    const result = parseConfig(config);
    expect(result.collections.logs.fields.createdAt).toBeDefined();
  });

  it('always rejects id field', () => {
    const config: InfernoCMSConfig = {
      collections: {
        logs: {
          timestamps: false,
          fields: { id: 'number' },
        },
      },
    };
    expect(() => parseConfig(config)).toThrow(/reserved/i);
  });
});
