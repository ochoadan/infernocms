import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { dispatchWebhooks } from './webhooks.js';
import type { WebhookConfig } from './config/domain-types.js';

const mockFetch = vi.fn(() => Promise.resolve(new Response('ok')));
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue(new Response('ok'));
});

describe('dispatchWebhooks', () => {
  const baseHook: WebhookConfig = { url: 'https://example.com/hook' };

  it('sends POST with correct payload shape', () => {
    const data = { id: 1, title: 'Hello' };
    dispatchWebhooks([baseHook], 'create', 'posts', data);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.com/hook');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(opts.body as string);
    expect(body.event).toBe('create');
    expect(body.collection).toBe('posts');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.data).toEqual(data);
  });

  it('filters by collection — skips non-matching', () => {
    const hook: WebhookConfig = { url: 'https://example.com/hook', collections: ['posts'] };
    dispatchWebhooks([hook], 'create', 'pages', { id: 1 });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('filters by collection — fires for matching', () => {
    const hook: WebhookConfig = { url: 'https://example.com/hook', collections: ['posts'] };
    dispatchWebhooks([hook], 'create', 'posts', { id: 1 });

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('filters by event — skips non-matching', () => {
    const hook: WebhookConfig = { url: 'https://example.com/hook', events: ['create'] };
    dispatchWebhooks([hook], 'delete', 'posts', { id: 1 });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('filters by event — fires for matching', () => {
    const hook: WebhookConfig = { url: 'https://example.com/hook', events: ['create', 'update'] };
    dispatchWebhooks([hook], 'update', 'posts', { id: 1 });

    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('fires for all events and collections when no filters set', () => {
    dispatchWebhooks([baseHook], 'delete', 'anything', { id: 99 });
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('fires multiple webhooks that match', () => {
    const hooks: WebhookConfig[] = [
      { url: 'https://a.com/hook' },
      { url: 'https://b.com/hook' },
      { url: 'https://c.com/hook', collections: ['other'] },
    ];
    dispatchWebhooks(hooks, 'create', 'posts', { id: 1 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const urls = mockFetch.mock.calls.map((c: unknown[]) => c[0]);
    expect(urls).toEqual(['https://a.com/hook', 'https://b.com/hook']);
  });

  it('includes HMAC-SHA256 signature when secret is set', () => {
    const hook: WebhookConfig = { url: 'https://example.com/hook', secret: 'my-secret' };
    const data = { id: 1 };
    dispatchWebhooks([hook], 'create', 'posts', data);

    const [, opts] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['X-Inferno-Signature']).toBeDefined();

    // Verify it's a valid HMAC of the body
    const body = opts.body as string;
    const expected = createHmac('sha256', 'my-secret').update(body).digest('hex');
    expect(headers['X-Inferno-Signature']).toBe(expected);
  });

  it('omits signature header when no secret', () => {
    dispatchWebhooks([baseHook], 'create', 'posts', { id: 1 });

    const [, opts] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers['X-Inferno-Signature']).toBeUndefined();
  });

  it('does not throw on fetch failure', () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    expect(() => {
      dispatchWebhooks([baseHook], 'create', 'posts', { id: 1 });
    }).not.toThrow();
  });

  it('passes an AbortSignal for timeout', () => {
    dispatchWebhooks([baseHook], 'create', 'posts', { id: 1 });

    const [, opts] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });
});
