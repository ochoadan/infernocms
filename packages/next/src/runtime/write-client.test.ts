import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWriteClientFactory } from './write-client.js';

interface Schema {
  posts: { id: number; title: string; slug: string };
  submissions: { id: number; email: string; message: string };
}

const mockFetch = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200 }));
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('createWriteClientFactory', () => {
  const url = 'https://cms.example.com';

  it('throws if no token is provided', () => {
    const writeCms = createWriteClientFactory<Schema>({ url });
    expect(() => writeCms({ token: '' })).toThrow(/token/);
  });

  it('create POSTs JSON with bearer token and unwraps data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 1, email: 'a@b.c', message: 'hi' } }, 201));
    const writeCms = createWriteClientFactory<Schema>({ url });
    const wc = writeCms({ token: 'icms_admin' });
    const result = await wc.submissions.create({ email: 'a@b.c', message: 'hi' });
    expect(result).toEqual({ id: 1, email: 'a@b.c', message: 'hi' });

    const [calledUrl, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(`${url}/api/submissions`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer icms_admin');
    expect(headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c', message: 'hi' });
  });

  it('update PATCHes the right URL', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 5, title: 'updated' } }));
    const writeCms = createWriteClientFactory<Schema>({ url });
    const wc = writeCms({ token: 'icms_admin' });
    await wc.posts.update(5, { title: 'updated' });

    const [calledUrl, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(`${url}/api/posts/5`);
    expect(init.method).toBe('PATCH');
  });

  it('delete sends DELETE and resolves on 204', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const writeCms = createWriteClientFactory<Schema>({ url });
    const wc = writeCms({ token: 'icms_admin' });
    await expect(wc.posts.delete(7)).resolves.toBeUndefined();

    const [calledUrl, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toBe(`${url}/api/posts/7`);
    expect(init.method).toBe('DELETE');
  });

  it('exposes read methods too (combined read/write surface)', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: 1 }], meta: { total: 1, page: 1, perPage: 10, totalPages: 1 } })
    );
    const writeCms = createWriteClientFactory<Schema>({ url });
    const wc = writeCms({ token: 'icms_admin' });
    const list = await wc.posts.list();
    expect(list.data).toHaveLength(1);
  });

  it('mutation requests bypass the cache', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 1 } }));
    const writeCms = createWriteClientFactory<Schema>({ url });
    const wc = writeCms({ token: 'icms_admin' });
    await wc.posts.create({ title: 'x' });
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.cache).toBe('no-store');
  });

  it('throws if called in a browser context', () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = {};
    try {
      const writeCms = createWriteClientFactory<Schema>({ url });
      expect(() => writeCms({ token: 'icms_admin' })).toThrow(/browser/i);
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = originalWindow;
      }
    }
  });
});
