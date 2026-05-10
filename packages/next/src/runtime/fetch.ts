import { CmsApiError, type CacheOpts } from './types.js';

interface CmsFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  url: string;
  token?: string;
  body?: unknown;
  collection?: string;
  cache?: CacheOpts;
}

interface NextFetchInit extends RequestInit {
  next?: { revalidate?: number | false; tags?: string[] };
}

const DEFAULT_REVALIDATE = 60;

function resolveCache(collection: string | undefined, cache: CacheOpts | undefined): NextFetchInit['next'] {
  const next: { revalidate?: number | false; tags?: string[] } = {};
  if (cache?.revalidate !== undefined) {
    next.revalidate = cache.revalidate;
  } else {
    next.revalidate = DEFAULT_REVALIDATE;
  }
  if (cache?.tags) {
    next.tags = cache.tags;
  } else if (collection) {
    next.tags = [`cms:${collection}`];
  }
  return next;
}

export async function cmsFetch<T = unknown>(opts: CmsFetchOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;

  const init: NextFetchInit = {
    method: opts.method ?? 'GET',
    headers,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  if (init.method === 'GET' || !init.method) {
    init.next = resolveCache(opts.collection, opts.cache);
  } else {
    // Mutations bypass the cache.
    init.cache = 'no-store';
  }

  const res = await fetch(opts.url, init);
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    let code: string | undefined;
    try {
      const j = (await res.json()) as { error?: { message?: string; code?: string } };
      if (j?.error?.message) message = j.error.message;
      if (j?.error?.code) code = j.error.code;
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new CmsApiError(res.status, message, code);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function buildSearchParams(opts: {
  where?: Record<string, string | number | boolean>;
  sort?: string;
  page?: number;
  perPage?: number;
  depth?: number;
  fields?: string[];
  search?: string;
}): string {
  const sp = new URLSearchParams();
  if (opts.page !== undefined) sp.set('page', String(opts.page));
  if (opts.perPage !== undefined) sp.set('perPage', String(opts.perPage));
  if (opts.sort !== undefined) sp.set('sort', opts.sort);
  if (opts.depth !== undefined) sp.set('depth', String(opts.depth));
  if (opts.fields !== undefined) sp.set('fields', opts.fields.join(','));
  if (opts.search !== undefined) sp.set('search', opts.search);
  if (opts.where) {
    for (const [k, v] of Object.entries(opts.where)) {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
