import { describe, it, expect } from 'vitest';
import { resolveCmsUrl, extractHostPattern } from './resolve.js';

describe('resolveCmsUrl', () => {
  const base = 'https://cms.example.com';

  it('returns null for empty values', () => {
    expect(resolveCmsUrl(null, base)).toBeNull();
    expect(resolveCmsUrl(undefined, base)).toBeNull();
    expect(resolveCmsUrl('', base)).toBeNull();
  });

  it('returns absolute URLs unchanged', () => {
    expect(resolveCmsUrl('https://other.com/foo.jpg', base)).toBe('https://other.com/foo.jpg');
    expect(resolveCmsUrl('http://local.test/foo.jpg', base)).toBe('http://local.test/foo.jpg');
  });

  it('prefixes leading-slash paths with baseUrl', () => {
    expect(resolveCmsUrl('/uploads/foo.jpg', base)).toBe('https://cms.example.com/uploads/foo.jpg');
    expect(resolveCmsUrl('/api/posts/1/cover', base)).toBe('https://cms.example.com/api/posts/1/cover');
  });

  it('prefixes uploads/ relative paths with baseUrl', () => {
    expect(resolveCmsUrl('uploads/foo.jpg', base)).toBe('https://cms.example.com/uploads/foo.jpg');
  });

  it('treats bare filenames as relative to /uploads/', () => {
    expect(resolveCmsUrl('foo.jpg', base)).toBe('https://cms.example.com/uploads/foo.jpg');
  });

  it('strips trailing slashes from baseUrl', () => {
    expect(resolveCmsUrl('/uploads/foo.jpg', 'https://cms.example.com/')).toBe('https://cms.example.com/uploads/foo.jpg');
    expect(resolveCmsUrl('/uploads/foo.jpg', 'https://cms.example.com////')).toBe('https://cms.example.com/uploads/foo.jpg');
  });

  it('returns the raw src when baseUrl is missing (best-effort fallback)', () => {
    expect(resolveCmsUrl('/uploads/foo.jpg', undefined)).toBe('/uploads/foo.jpg');
  });
});

describe('extractHostPattern', () => {
  it('parses https URLs', () => {
    expect(extractHostPattern('https://cms.example.com')).toEqual({ protocol: 'https', hostname: 'cms.example.com' });
  });

  it('parses http URLs', () => {
    expect(extractHostPattern('http://localhost:4000')).toEqual({ protocol: 'http', hostname: 'localhost' });
  });

  it('returns null for invalid URLs', () => {
    expect(extractHostPattern('not a url')).toBeNull();
    expect(extractHostPattern(undefined)).toBeNull();
  });

  it('rejects non-http(s) protocols', () => {
    expect(extractHostPattern('ftp://x.com')).toBeNull();
  });
});
