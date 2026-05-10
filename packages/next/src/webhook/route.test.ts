import { describe, it, expect, beforeEach, vi } from 'vitest';

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();

vi.mock('next/cache', () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

import { createInfernoCmsRevalidateRoute } from './route.js';

beforeEach(() => {
  revalidateTag.mockReset();
  revalidatePath.mockReset();
});

function makeRequest(body: unknown, secret = 'shh'): Request {
  return new Request('https://example.com/api/webhook', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('createInfernoCmsRevalidateRoute', () => {
  it('throws at construction if no secret is provided', () => {
    expect(() => createInfernoCmsRevalidateRoute({ secret: '' })).toThrow(/secret/);
  });

  it('returns 401 when authorization header is missing', async () => {
    const handler = createInfernoCmsRevalidateRoute({ secret: 'shh' });
    const req = new Request('https://example.com/api/webhook', { method: 'POST', body: '{}' });
    const res = await handler(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when bearer token does not match', async () => {
    const handler = createInfernoCmsRevalidateRoute({ secret: 'shh' });
    const res = await handler(makeRequest({ event: 'create', collection: 'posts', data: {}, timestamp: 'now' }, 'wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const handler = createInfernoCmsRevalidateRoute({ secret: 'shh' });
    const req = new Request('https://example.com/api/webhook', {
      method: 'POST',
      headers: { authorization: 'Bearer shh', 'content-type': 'application/json' },
      body: 'not json',
    });
    const res = await handler(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when payload shape is invalid', async () => {
    const handler = createInfernoCmsRevalidateRoute({ secret: 'shh' });
    const res = await handler(makeRequest({ event: 'create' }));
    expect(res.status).toBe(400);
  });

  it('revalidates the default `cms:${collection}` tag', async () => {
    const handler = createInfernoCmsRevalidateRoute({ secret: 'shh' });
    const res = await handler(makeRequest({ event: 'update', collection: 'posts', data: { id: 1 }, timestamp: 'now' }));
    expect(res.status).toBe(200);
    expect(revalidateTag).toHaveBeenCalledWith('cms:posts');
    const body = (await res.json()) as { data: { revalidatedTags: string[] } };
    expect(body.data.revalidatedTags).toEqual(['cms:posts']);
  });

  it('calls the optional paths() callback and revalidates each path', async () => {
    const handler = createInfernoCmsRevalidateRoute({
      secret: 'shh',
      paths: ({ collection, data }) => {
        if (collection === 'posts' && typeof data.slug === 'string') {
          return ['/blog', `/blog/${data.slug}`];
        }
        return [];
      },
    });
    const res = await handler(
      makeRequest({ event: 'update', collection: 'posts', data: { id: 1, slug: 'hello' }, timestamp: 'now' })
    );
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith('/blog');
    expect(revalidatePath).toHaveBeenCalledWith('/blog/hello');
  });

  it('honors a custom tag() callback returning null to skip tag revalidation', async () => {
    const handler = createInfernoCmsRevalidateRoute({
      secret: 'shh',
      tag: () => null,
    });
    const res = await handler(makeRequest({ event: 'create', collection: 'posts', data: {}, timestamp: 'now' }));
    expect(res.status).toBe(200);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
