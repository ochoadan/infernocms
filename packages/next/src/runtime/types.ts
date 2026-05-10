export interface CmsClientBaseOptions {
  /** Base URL of the InfernoCMS instance, e.g. `https://cms.example.com`. */
  url?: string;
  /** Optional read token if reads are gated. */
  readToken?: string;
}

export interface ListOpts {
  where?: Record<string, string | number | boolean>;
  sort?: string;
  page?: number;
  perPage?: number;
  depth?: number;
  fields?: string[];
  search?: string;
  cache?: CacheOpts;
}

export interface SingleOpts {
  depth?: number;
  cache?: CacheOpts;
}

export interface CacheOpts {
  /** Next.js `revalidate` value, in seconds. `false` disables revalidation. */
  revalidate?: number | false;
  /** Next.js cache tags. Defaults to `[`cms:${collection}`]`. */
  tags?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export class CmsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'CmsApiError';
  }
}

export interface BaseReadCollection<T> {
  list(opts?: ListOpts): Promise<PaginatedResponse<T>>;
  byId(id: number | string, opts?: SingleOpts): Promise<T>;
  byField(fieldName: string, value: string | number, opts?: SingleOpts): Promise<T>;
  count(where?: Record<string, string | number | boolean>): Promise<number>;
}

export interface SlugReadCollection<T> extends BaseReadCollection<T> {
  bySlug(slug: string, opts?: SingleOpts): Promise<T>;
}

export type ReadClient<S, SC extends keyof S = never> = {
  [K in keyof S]: K extends SC ? SlugReadCollection<S[K]> : BaseReadCollection<S[K]>;
};

export interface BaseWriteCollection<T> extends BaseReadCollection<T> {
  create(data: Partial<T>): Promise<T>;
  update(id: number | string, data: Partial<T>): Promise<T>;
  delete(id: number | string): Promise<void>;
}

export interface SlugWriteCollection<T> extends BaseWriteCollection<T> {
  bySlug(slug: string, opts?: SingleOpts): Promise<T>;
}

export type WriteClient<S, SC extends keyof S = never> = {
  [K in keyof S]: K extends SC ? SlugWriteCollection<S[K]> : BaseWriteCollection<S[K]>;
};
