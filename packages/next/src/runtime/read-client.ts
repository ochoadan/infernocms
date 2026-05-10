import { cmsFetch, buildSearchParams } from './fetch.js';
import type {
  CmsClientBaseOptions,
  ListOpts,
  SingleOpts,
  PaginatedResponse,
  SingleResponse,
  ReadClient,
} from './types.js';

interface InternalReadOpts extends CmsClientBaseOptions {
  /** Override the env defaults for testing or non-process.env environments. */
  fetchImpl?: typeof fetch;
}

function resolveBaseUrl(opts: CmsClientBaseOptions): string {
  const url = opts.url;
  if (!url) {
    throw new Error(
      'InfernoCMS URL not configured. Set INFERNOCMS_URL or pass `url` explicitly.'
    );
  }
  return url.replace(/\/+$/, '');
}

function makeCollectionHandle(name: string, opts: CmsClientBaseOptions) {
  const baseUrl = () => `${resolveBaseUrl(opts)}/api/${name}`;
  const token = opts.readToken;

  return {
    async list(listOpts: ListOpts = {}): Promise<PaginatedResponse<unknown>> {
      const url = `${baseUrl()}${buildSearchParams(listOpts)}`;
      return cmsFetch<PaginatedResponse<unknown>>({
        url,
        token,
        collection: name,
        cache: listOpts.cache,
      });
    },

    async byId(id: number | string, singleOpts: SingleOpts = {}): Promise<unknown> {
      const qs = buildSearchParams({ depth: singleOpts.depth });
      const url = `${baseUrl()}/${encodeURIComponent(String(id))}${qs}`;
      const res = await cmsFetch<SingleResponse<unknown>>({
        url,
        token,
        collection: name,
        cache: singleOpts.cache,
      });
      return res.data;
    },

    async bySlug(slug: string, singleOpts: SingleOpts = {}): Promise<unknown> {
      const qs = buildSearchParams({
        where: { slug },
        depth: singleOpts.depth,
        perPage: 1,
      });
      const url = `${baseUrl()}${qs}`;
      const res = await cmsFetch<PaginatedResponse<unknown>>({
        url,
        token,
        collection: name,
        cache: singleOpts.cache,
      });
      const item = res.data[0];
      if (!item) {
        const { CmsApiError } = await import('./types.js');
        throw new CmsApiError(404, `${name}: no item found with slug "${slug}"`, 'NOT_FOUND');
      }
      return item;
    },

    async byField(
      fieldName: string,
      value: string | number,
      singleOpts: SingleOpts = {}
    ): Promise<unknown> {
      const qs = buildSearchParams({
        where: { [fieldName]: value },
        depth: singleOpts.depth,
        perPage: 1,
      });
      const url = `${baseUrl()}${qs}`;
      const res = await cmsFetch<PaginatedResponse<unknown>>({
        url,
        token,
        collection: name,
        cache: singleOpts.cache,
      });
      const item = res.data[0];
      if (!item) {
        const { CmsApiError } = await import('./types.js');
        throw new CmsApiError(
          404,
          `${name}: no item found with ${fieldName} = ${String(value)}`,
          'NOT_FOUND'
        );
      }
      return item;
    },

    async count(where?: Record<string, string | number | boolean>): Promise<number> {
      const qs = buildSearchParams({ where, perPage: 1 });
      const url = `${baseUrl()}${qs}`;
      const res = await cmsFetch<PaginatedResponse<unknown>>({
        url,
        token,
        collection: name,
      });
      return res.meta.total;
    },
  };
}

export function createReadClient<S, SC extends keyof S = never>(
  opts: CmsClientBaseOptions
): ReadClient<S, SC> {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== 'string') return undefined;
        return makeCollectionHandle(prop, opts);
      },
    }
  ) as ReadClient<S, SC>;
}

export type { InternalReadOpts };
