import { useState } from 'react';

import { cn } from '@src/lib/utils';

import { buildRatioWebpSrcSet, buildSrcSet } from './Image.utils';
import { imageVariants } from './Image.variants';

import type { ImageProps } from './Image.interface';

/**
 * Image – Responsive image with lazy-loading default, optional WebP <source>
 * via explicit ``webpSrc``, optional responsive srcset, and generic fallback
 * for missing/errored sources.
 *
 * - When ``src`` is ``null``/empty or the image errors, ``fallback`` is rendered instead.
 * - When a WebP source is available (``webpSrcSet``, ``webpKeys`` or ``webpSrc``),
 *   the image renders inside a <picture> with the WebP variant as preferred
 *   source (data-driven from the asset's keys). ``webpKeys`` builds a responsive
 *   srcset (800w/1280w/1920w) via ``getStreamUrl``; ``webpSrcSet`` (ready-made
 *   string) takes precedence, plain ``webpSrc`` is the single-URL fallback.
 *   Without any of them (original only – e.g. profile photo or SVG) a plain
 *   <img> is rendered.
 * - `loading="lazy"` is the default (opt-out via explicit `loading="eager"`).
 * - `srcset` prop generates 400w/1200w descriptors on the <img>.
 * - Error state auto-resets when ``src`` changes (``erroredSrc``/``webpErroredSrc``).
 * - If the WebP <source> fails (e.g. missing derived variant), falls back to a
 *   plain <img> on the original instead of breaking.
 */
export default function Image({
  fit = 'cover',
  frame = 'none',
  loading = 'lazy',
  srcset,
  webpSrc,
  webpSrcSet,
  webpKeys,
  ratio,
  objectPosition,
  fallback,
  ...domProps
}: ImageProps) {
  const { src, alt, sizes, ...restDomProps } = domProps;
  const variants = cn(imageVariants({ fit, frame }));
  const focalStyle = objectPosition ? { objectPosition } : undefined;

  // ── Error state (auto-resets when src changes) ─────────────────────────────
  const [erroredSrc, setErroredSrc] = useState<string | null>(null);
  const [webpErroredSrc, setWebpErroredSrc] = useState<string | null>(null);
  const errored = erroredSrc === src;
  const webpErrored = webpErroredSrc === src;

  const handleError = () => setErroredSrc(src ?? null);

  const srcSet = buildSrcSet(srcset);

  // WebP <source> srcSet: ready-made string > data-driven webpKeys[ratio] > single webpSrc.
  const webpSourceSrcSet =
    webpSrcSet ?? buildRatioWebpSrcSet(webpKeys, ratio) ?? webpSrc;

  // ── Fallback: missing src or load error on the original ───────────────────
  if ((!src || errored) && fallback) {
    return fallback as React.ReactElement;
  }

  // WebP variant available and not failed → <picture> with responsive WebP
  // <source> first, original-format <img> as fallback. If the WebP <source>
  // fails to load (e.g. the derived variant is missing in storage), we fall
  // back to a plain <img> on the original instead of a broken <picture>.
  if (webpSourceSrcSet && !webpErrored) {
    return (
      <picture>
        <source type="image/webp" srcSet={webpSourceSrcSet} sizes={sizes} />
        <img
          className={variants}
          style={focalStyle}
          src={src}
          alt={alt}
          loading={loading}
          srcSet={srcSet}
          sizes={sizes}
          onError={() => setWebpErroredSrc(src ?? null)}
          {...restDomProps}
        />
      </picture>
    );
  }

  // No WebP variant (or it failed) → plain <img> on the original (also SVG/unknown).
  return (
    <img
      className={variants}
      style={focalStyle}
      src={src}
      alt={alt}
      loading={loading}
      srcSet={srcSet}
      sizes={sizes}
      onError={handleError}
      {...restDomProps}
    />
  );
}
