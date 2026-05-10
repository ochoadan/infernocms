import { describe, it, expect } from 'vitest';
import { defineConfig, field, parseConfig } from 'infernocms';
import { emitTypes } from './emit-types.js';

function build(c: ReturnType<typeof defineConfig>) {
  return parseConfig(c);
}

describe('emitTypes', () => {
  it('emits interfaces for every collection', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: {
            fields: {
              title: field.text({ required: true }),
              body: field.richtext(),
            },
          },
          authors: {
            fields: { name: field.text({ required: true }) },
          },
        },
      })
    );
    const out = emitTypes(cfg);
    expect(out).toContain('export interface Posts {');
    expect(out).toContain('export interface Authors {');
  });

  it('makes required fields non-optional and others optional', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: {
            fields: {
              title: field.text({ required: true }),
              subtitle: field.text(),
            },
          },
        },
      })
    );
    const out = emitTypes(cfg);
    expect(out).toContain('title: string;');
    expect(out).toContain('subtitle?: string;');
  });

  it('types select fields as a union of allowed values', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: {
            fields: {
              status: field.select({ options: ['draft', 'published'], required: true }),
            },
          },
        },
      })
    );
    expect(emitTypes(cfg)).toContain("status: 'draft' | 'published';");
  });

  it('types single relations as `number | RelatedType`', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: {
            fields: { author: field.relation({ collection: 'authors' }) },
          },
          authors: { fields: { name: field.text({ required: true }) } },
        },
      })
    );
    expect(emitTypes(cfg)).toContain('author?: number | Authors;');
  });

  it('types many relations as `Array<number | RelatedType>`', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: {
            fields: { tags: field.relation({ collection: 'tags', many: true }) },
          },
          tags: { fields: { name: field.text({ required: true }) } },
        },
      })
    );
    expect(emitTypes(cfg)).toContain('tags?: Array<number | Tags>;');
  });

  it('emits a Schema map keyed by collection name', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: { fields: { title: field.text({ required: true }) } },
          authors: { fields: { name: field.text({ required: true }) } },
        },
      })
    );
    const out = emitTypes(cfg);
    expect(out).toContain('export interface Schema {');
    expect(out).toContain('posts: Posts;');
    expect(out).toContain('authors: Authors;');
  });

  it('emits SlugCollection only for collections with a slug field', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: {
            fields: {
              title: field.text({ required: true }),
              slug: field.slug({ from: 'title' }),
            },
          },
          authors: { fields: { name: field.text({ required: true }) } },
        },
      })
    );
    const out = emitTypes(cfg);
    expect(out).toContain("export type SlugCollection = 'posts';");
  });

  it('emits SlugCollection = never when no collection has a slug field', () => {
    const cfg = build(
      defineConfig({
        collections: {
          authors: { fields: { name: field.text({ required: true }) } },
        },
      })
    );
    expect(emitTypes(cfg)).toContain('export type SlugCollection = never;');
  });

  it('includes timestamps when enabled', () => {
    const cfg = build(
      defineConfig({
        collections: {
          posts: { fields: { title: field.text({ required: true }) } },
        },
      })
    );
    const out = emitTypes(cfg);
    expect(out).toContain('createdAt');
    expect(out).toContain('updatedAt');
  });
});
