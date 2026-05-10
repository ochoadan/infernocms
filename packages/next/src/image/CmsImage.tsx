import type { ReactElement } from 'react';
import Image, { type ImageProps } from 'next/image';
import { resolveCmsUrl } from './resolve.js';

export interface CmsImageProps extends Omit<ImageProps, 'src'> {
  /** A CMS image/file value. Accepts absolute URLs, `/uploads/...`, or bare filenames. */
  src: string | null | undefined;
  /**
   * Optional base URL override. Defaults to `process.env.INFERNOCMS_URL`
   * (or `process.env.NEXT_PUBLIC_INFERNOCMS_URL` if running in a browser context).
   */
  baseUrl?: string;
}

function defaultBaseUrl(): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env.INFERNOCMS_URL ?? process.env.NEXT_PUBLIC_INFERNOCMS_URL;
}

/**
 * Wrapper around Next's `<Image>` that resolves InfernoCMS image/file fields.
 * Returns `null` when src is empty so consumers can drop it on optional fields
 * without conditionals.
 */
export function CmsImage(props: CmsImageProps): ReactElement | null {
  const { src, baseUrl, ...rest } = props;
  const resolved = resolveCmsUrl(src, baseUrl ?? defaultBaseUrl());
  if (!resolved) return null;
  return <Image src={resolved} {...rest} />;
}
