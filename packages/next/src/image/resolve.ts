/**
 * Resolve a CMS image/file `src` value to an absolute URL.
 *
 * - Empty / null / undefined → returns null (caller should not render).
 * - Absolute http(s) URL → returned unchanged.
 * - Path-style values (`/uploads/foo.jpg`, `uploads/foo.jpg`) → prefixed with `baseUrl`.
 * - Bare filenames (`foo.jpg`) → also resolved against `baseUrl/uploads/`.
 *
 * `baseUrl` should be the CMS root (e.g. `https://cms.example.com`), with no trailing slash.
 */
export function resolveCmsUrl(src: string | null | undefined, baseUrl: string | undefined): string | null {
  if (!src) return null;
  if (/^https?:\/\//.test(src)) return src;
  if (!baseUrl) return src; // best-effort fallback so dev without env still renders something

  const trimmedBase = baseUrl.replace(/\/+$/, '');
  if (src.startsWith('/')) return `${trimmedBase}${src}`;
  if (src.startsWith('uploads/')) return `${trimmedBase}/${src}`;
  return `${trimmedBase}/uploads/${src}`;
}

/**
 * Extract the host (and protocol) for use in Next's `images.remotePatterns`.
 * Returns null if the URL is malformed.
 */
export function extractHostPattern(baseUrl: string | undefined): { protocol: 'http' | 'https'; hostname: string } | null {
  if (!baseUrl) return null;
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return { protocol: u.protocol === 'https:' ? 'https' : 'http', hostname: u.hostname };
  } catch {
    return null;
  }
}
