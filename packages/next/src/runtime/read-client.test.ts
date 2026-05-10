import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createReadClient } from './read-client.js';
import { CmsApiError } from './types.js';

interface Schema {
  posts: { id: number; title: string; slug: string };
  authors: { id: number; name: string };
}

const mockFetch = vi.fn(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('createReadClient', () => {
  it('throws if no url is configured at call time', async () => {
    const cms = createReadClient<Schema, 'posts'>({});
    await expect(cms.posts.list()).rejects.toThrow(/INFERNOCMS_URL/);
  });

  it('list builds the correct URL with query params', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [{ id: 1, title: 'a' }], meta: { total: 1, page: 1, perPage: 10, totalPages: 1 } })
    );
    const cms = createReadClient<Schema, 'posts'>({ url: 'https://cms.example.com' });
    const result = await cms.posts.list({ page: 2, perPage: 25, sort: '-createdAt', where: { status: 'published' } });
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('https://cms.example.com/api/posts?');
    expect(url).toContain('page=2');
    expect(url).toContain('perPage=25');
    expect(url).toContain('sort=-createdAt');
    expect(url).toContain('status=published');
    expect(result.data).toHaveLength(1);
  });

  it('byId fetches a single item and unwraps data', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 5, title: 'hello' } }));
    const cms = createReadClient<Schema, 'posts'>({ url: 'https://cms.example.com' });
    const post = await cms.posts.byId(5);
    expect(post).toEqual({ id: 5, title: 'hello' });
    const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://cms.example.com/api/posts/5');
  });

  it('byId passes depth as a query param', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: { id: 5 } }));
    const cms = createReadClient<Schema, 'posts'>({ url: 'https://cms.example.com' });
    await cms.posts.byId(5, { depth: 2 });
    const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://cms.example.com/api/posts/5?depth=2');
  });

  it('bySlug filters by slug field and returns the first match', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [{ id: 7, slug: 'hello' }],
        meta: { total: 1, page: 1, perPage: 1, totalPages: 1 },
      })
    );
    const cms = createReadClient<Schema, 'posts'>({ url: 'https://cms.example.com' });
    const post = await cms.posts.bySlug('hello');
    expect(post).toEqual({ id: 7, slug: 'hello' });
    const [url] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('slug=hello');
    expect(url).toContain('perPage=1');
  });

  it('bySlug throws CmsApiError 404 when no match', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], meta: { total: 0, page: 1, perPage: 1, totalPages: 0 } })
    );
    const cms = createReadClient<Schema, 'posts'>({ url: 'https://cms.example.com' });
    await expect(cms.posts.bySlug('missing')).rejects.toBeInstanceOf(CmsApiError);
  });

  it('count returns the meta.total from a 1-item list query', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({
        data: [{ id: 1 }],
        meta: { total: 42, page: 1, perPage: 1, totalPages: 42 },
      })
    );
    const cms = createReadClient<Schema, 'posts'>({ url: 'https://cms.example.com' });
    const n = await cms.posts.count({ status: 'published' });
    expect(n).toBe(42);
  });

  it('sends the read token as a Bearer header when configured', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], meta: { total: 0, page: 1, perPage: 10, totalPages: 0 } })
    );
    const cms = createReadClient<Schema>({ url: 'https://cms.example.com', readToken: 'icms_secret' });
    await cms.posts.list();
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer icms_secret');
  });

  it('omits Authorization header when no read token is set', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], meta: { total: 0, page: 1, perPage: 10, totalPages: 0 } })
    );
    const cms = createReadClient<Schema>({ url: 'https://cms.example.com' });
    await cms.posts.list();
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('applies default cache tag `cms:${collection}` and revalidate=60', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], meta: { total: 0, page: 1, perPage: 10, totalPages: 0 } })
    );
    const cms = createReadClient<Schema>({ url: 'https://cms.example.com' });
    await cms.posts.list();
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit & { next?: { revalidate?: number; tags?: string[] } }];
    expect(init.next?.revalidate).toBe(60);
    expect(init.next?.tags).toEqual(['cms:posts']);
  });

  it('honors per-call cache override', async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ data: [], meta: { total: 0, page: 1, perPage: 10, totalPages: 0 } })
    );
    const cms = createReadClient<Schema>({ url: 'https://cms.example.com' });
    await cms.posts.list({ cache: { revalidate: 0, tags: ['custom'] } });
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit & { next?: { revalidate?: number; tags?: string[] } }];
    expect(init.next?.revalidate).toBe(0);
    expect(init.next?.tags).toEqual(['custom']);
  });

  it('throws CmsApiError on non-2xx with structured error body', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { message: 'Forbidden', code: 'FORBIDDEN' } }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const cms = createReadClient<Schema>({ url: 'https://cms.example.com' });
    await expect(cms.posts.list()).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
      code: 'FORBIDDEN',
    });
  });
});
