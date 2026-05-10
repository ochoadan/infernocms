import { extractHostPattern } from '../image/resolve.js';

export interface WithInfernoCmsOptions {
  /** Base URL of the InfernoCMS instance. Defaults to `process.env.INFERNOCMS_URL`. */
  url?: string;
  /** Path to content.config.ts. Defaults to `./content.config.ts`. */
  configPath?: string;
  /**
   * Additional remote-pattern hosts to allow for `next/image`. The CMS host
   * is added automatically.
   */
  extraImageHosts?: string[];
}

interface RemotePattern {
  protocol?: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
}

interface MinimalNextConfig {
  images?: {
    remotePatterns?: RemotePattern[];
  };
  [key: string]: unknown;
}

/**
 * Next.js config wrapper for InfernoCMS-backed projects.
 *
 * Usage:
 * ```ts
 * // next.config.ts
 * import { withInfernoCMS } from '@infernocms/next/config';
 * export default withInfernoCMS({ url: process.env.INFERNOCMS_URL })({
 *   // your existing next config
 * });
 * ```
 *
 * What it does:
 * - Adds the CMS host to `images.remotePatterns` so `<CmsImage>` works.
 * - Warns if `url` is missing (no env, no explicit option).
 *
 * Note: codegen is intentionally NOT auto-triggered here. Add `infernocms-next
 * codegen` to your `predev`/`prebuild` scripts, or run `infernocms-next watch`
 * alongside `next dev`.
 */
export function withInfernoCMS(opts: WithInfernoCmsOptions = {}): (
  config?: MinimalNextConfig
) => MinimalNextConfig {
  const url = opts.url ?? process.env.INFERNOCMS_URL;
  if (!url) {
    // eslint-disable-next-line no-console
    console.warn(
      '[@infernocms/next] withInfernoCMS: no `url` option and INFERNOCMS_URL env var is not set. ' +
        'Image domain will not be added to remotePatterns.'
    );
  }

  return function apply(config: MinimalNextConfig = {}): MinimalNextConfig {
    const next: MinimalNextConfig = { ...config };
    const existingImages = (config.images ?? {}) as { remotePatterns?: RemotePattern[] };
    const existingPatterns = existingImages.remotePatterns ?? [];

    const newPatterns: RemotePattern[] = [];
    const cmsPattern = extractHostPattern(url);
    if (cmsPattern) newPatterns.push({ ...cmsPattern, pathname: '/uploads/**' });
    for (const host of opts.extraImageHosts ?? []) {
      const p = extractHostPattern(host);
      if (p) newPatterns.push({ ...p, pathname: '/**' });
    }

    next.images = {
      ...existingImages,
      remotePatterns: [...existingPatterns, ...newPatterns],
    };
    return next;
  };
}
