import { getStreamUrl } from '@src/lib/getStreamUrl';

/**
 * Select the width-set for the requested `ratio` from the nested `webpKeys`
 * set (ratio → width → key) and build its responsive WebP srcSet. Returns
 * `undefined` when `ratio`/`webpKeys` are unset or the ratio has no widths
 * (no auto-derive – callers stay data-driven).
 */
export function buildRatioWebpSrcSet(
  webpKeys: Record<string, Record<string, string>> | undefined,
  ratio: string | undefined,
): string | undefined {
  if (!webpKeys || !ratio) return undefined;
  return buildWebpSrcSet(webpKeys[ratio]);
}

/** Build a srcSet string with 400w/1200w descriptors from the original (non-WebP) variants. */
export function buildSrcSet(srcset: { thumbnail: string; full: string } | undefined): string | undefined {
  if (!srcset) return undefined;
  return `${srcset.thumbnail} 400w, ${srcset.full} 1200w`;
}

/**
 * Build a responsive WebP srcSet from the `webpKeys` variant set
 * (width-label → storage key, e.g. `{ "800": "prefix/uuid.800.webp" }`).
 *
 * Only numeric labels produce `w` descriptors (ascending); non-numeric labels
 * (e.g. `"orig"` for the single JPEG variant) are skipped – mixing x-/w-
 * descriptors in one srcSet is invalid HTML. URLs are derived via the shared
 * `getStreamUrl` helper. Returns `undefined` for empty/unset sets (no
 * auto-derive – callers stay data-driven).
 */
export function buildWebpSrcSet(webpKeys: Record<string, string> | undefined): string | undefined {
  if (!webpKeys) return undefined;
  const variants = Object.entries(webpKeys)
    .map(([label, key]) => ({ width: Number(label), key }))
    .filter(({ width }) => Number.isFinite(width) && width > 0)
    .sort((a, b) => a.width - b.width);
  if (variants.length === 0) return undefined;
  return variants.map(({ width, key }) => `${getStreamUrl(key)} ${width}w`).join(', ');
}
