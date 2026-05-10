import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { withInfernoCMS } from './with-inferno-cms.js';

const originalEnv = process.env.INFERNOCMS_URL;

beforeEach(() => {
  delete process.env.INFERNOCMS_URL;
});

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env.INFERNOCMS_URL;
  } else {
    process.env.INFERNOCMS_URL = originalEnv;
  }
});

describe('withInfernoCMS', () => {
  it('adds the CMS host to images.remotePatterns', () => {
    const wrap = withInfernoCMS({ url: 'https://cms.example.com' });
    const out = wrap({});
    expect(out.images?.remotePatterns).toContainEqual({
      protocol: 'https',
      hostname: 'cms.example.com',
      pathname: '/uploads/**',
    });
  });

  it('preserves existing remotePatterns', () => {
    const wrap = withInfernoCMS({ url: 'https://cms.example.com' });
    const out = wrap({
      images: {
        remotePatterns: [{ protocol: 'https', hostname: 'images.unsplash.com' }],
      },
    });
    expect(out.images?.remotePatterns).toHaveLength(2);
    expect(out.images?.remotePatterns?.[0]?.hostname).toBe('images.unsplash.com');
  });

  it('falls back to INFERNOCMS_URL env var', () => {
    process.env.INFERNOCMS_URL = 'http://localhost:4000';
    const wrap = withInfernoCMS();
    const out = wrap({});
    expect(out.images?.remotePatterns).toContainEqual({
      protocol: 'http',
      hostname: 'localhost',
      pathname: '/uploads/**',
    });
  });

  it('warns and skips remotePatterns when no url is configured', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrap = withInfernoCMS();
    const out = wrap({});
    expect(warn).toHaveBeenCalled();
    expect(out.images?.remotePatterns).toEqual([]);
    warn.mockRestore();
  });

  it('passes through unrelated next config keys unchanged', () => {
    const wrap = withInfernoCMS({ url: 'https://cms.example.com' });
    const out = wrap({
      reactStrictMode: true,
      experimental: { typedRoutes: true },
    } as never);
    expect((out as { reactStrictMode?: boolean }).reactStrictMode).toBe(true);
    expect((out as { experimental?: { typedRoutes?: boolean } }).experimental?.typedRoutes).toBe(true);
  });

  it('adds extraImageHosts to remotePatterns', () => {
    const wrap = withInfernoCMS({
      url: 'https://cms.example.com',
      extraImageHosts: ['https://cdn.example.com'],
    });
    const out = wrap({});
    const hosts = out.images?.remotePatterns?.map((p) => p.hostname);
    expect(hosts).toContain('cms.example.com');
    expect(hosts).toContain('cdn.example.com');
  });

  it('returns a callable wrapper that defaults config to {}', () => {
    const wrap = withInfernoCMS({ url: 'https://cms.example.com' });
    expect(() => wrap()).not.toThrow();
  });
});
