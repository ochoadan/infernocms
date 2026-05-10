import { cmsFetch, buildSearchParams } from './fetch.js';
import { createReadClient } from './read-client.js';
import { assertServerOnly } from './server-only.js';
import type {
  CmsClientBaseOptions,
  WriteClient,
  SingleResponse,
} from './types.js';

export interface WriteClientFactoryOptions extends CmsClientBaseOptions {}

interface WriteClientCallOptions {
  /** Bearer token used for write operations. Required. */
  token: string;
}

function makeWriteCollectionHandle(
  name: string,
  factoryOpts: WriteClientFactoryOptions,
  callOpts: WriteClientCallOptions,
  readHandle: Record<string, unknown>
) {
  const baseUrl = () => {
    const url = factoryOpts.url;
    if (!url) {
      throw new Error(
        'InfernoCMS URL not configured. Set INFERNOCMS_URL or pass `url` explicitly.'
      );
    }
    return `${url.replace(/\/+$/, '')}/api/${name}`;
  };
  const token = callOpts.token;

  return {
    ...readHandle,

    async create(data: Record<string, unknown>): Promise<unknown> {
      const res = await cmsFetch<SingleResponse<unknown>>({
        method: 'POST',
        url: baseUrl(),
        token,
        body: data,
      });
      return res.data;
    },

    async update(id: number | string, data: Record<string, unknown>): Promise<unknown> {
      const res = await cmsFetch<SingleResponse<unknown>>({
        method: 'PATCH',
        url: `${baseUrl()}/${encodeURIComponent(String(id))}`,
        token,
        body: data,
      });
      return res.data;
    },

    async delete(id: number | string): Promise<void> {
      await cmsFetch<void>({
        method: 'DELETE',
        url: `${baseUrl()}/${encodeURIComponent(String(id))}`,
        token,
      });
    },
  };
}

export function createWriteClientFactory<S, SC extends keyof S = never>(
  factoryOpts: WriteClientFactoryOptions
): (callOpts: WriteClientCallOptions) => WriteClient<S, SC> {
  return function writeCms(callOpts: WriteClientCallOptions): WriteClient<S, SC> {
    assertServerOnly('writeCms');
    if (!callOpts.token) {
      throw new Error('writeCms requires a bearer token. Pass `token` explicitly.');
    }

    // Build a read client that uses the write token for any read calls made
    // through the write client (gives logged-in admins consistent visibility).
    const readClient = createReadClient<S, SC>({
      url: factoryOpts.url,
      readToken: callOpts.token,
    });

    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (typeof prop !== 'string') return undefined;
          const readHandle = (readClient as unknown as Record<string, Record<string, unknown>>)[prop];
          return makeWriteCollectionHandle(prop, factoryOpts, callOpts, readHandle);
        },
      }
    ) as WriteClient<S, SC>;
  };
}

// Suppress unused-import warning for buildSearchParams — kept for future
// query-bearing write operations (e.g. patch by query).
void buildSearchParams;
