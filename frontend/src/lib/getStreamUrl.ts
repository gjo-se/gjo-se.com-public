/**
 * getStreamUrl – gemeinsamer URL-Builder für den generischen Stream-Endpoint.
 *
 * Das BE liefert für Assets nur den Storage-Key (nie eine URL); das FE leitet
 * daraus die Stream-URL ab. Domain-Services (Portfolio, Application Profile)
 * und Picker-/Preview-Aufrufer nutzen diesen einen Helper.
 *
 * Origin: `VITE_API_BASE_URL` wird vorangestellt, damit die Bild-Requests auf
 * prod (FE-Origin = www/CloudFront-SPA, das KEIN /api proxied) gegen den
 * API-Origin (`api.gjo-se.com`) laufen; dort folgt der 302 auf CloudFront.
 * Dev (Base leer/`undefined`) → relative URL, via Vite-/api-Proxy zum Backend.
 */
export const getStreamUrl = (key: string): string =>
  `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/stream/${key}`;

/** Ratio-Labels, die das BE für PNG-Master aus dem 16:9-Master erzeugt. */
const WEBP_RATIOS = ['16-9', '21-9', '4-3'] as const;
/** Width-Labels der ratio-cropped WebP-Varianten. */
const WEBP_WIDTHS = ['800', '1280', '1920'] as const;

/** Nested ratio→width→storage-key Set der WebP-Varianten. */
export type WebpKeys = Record<string, Record<string, string>>;
export type WebpRatio = (typeof WEBP_RATIOS)[number];

/**
 * Baut das nested ratio→width→key-Set aus einem Master-Key. Da die public API
 * nur den Master (`image_src`) liefert und das BE für PNG-Master deterministisch
 * 16-9/21-9/4-3 in 800/1280/1920 erzeugt, wird das Set hier datengetrieben
 * abgeleitet. Ohne Master-Key → `undefined` (kein Auto-Derive ins Leere).
 */
export function buildWebpKeys(masterKey: string | null | undefined): WebpKeys | undefined {
  if (!masterKey) return undefined;
  return WEBP_RATIOS.reduce<WebpKeys>((keys, ratio) => {
    keys[ratio] = WEBP_WIDTHS.reduce<Record<string, string>>((widths, width) => {
      widths[width] = getVariantKey(masterKey, ratio, width);
      return widths;
    }, {});
    return keys;
  }, {});
}

/**
 * Leitet den ratio/width-WebP-Varianten-Key aus einem Master-Key ab.
 * `portfolio/{base}.png` → `portfolio/{base}.{ratio}.{width}.webp`.
 */
export function getVariantKey(masterKey: string, ratio: string, width: string): string {
  const stem = masterKey.replace(/\.[^./]+$/, '');
  return `${stem}.${ratio}.${width}.webp`;
}

/** Stream-URL einer ratio/width-Variante (aus dem Master-Key abgeleitet). */
export function getVariantStreamUrl(masterKey: string, ratio: string, width: string): string {
  return getStreamUrl(getVariantKey(masterKey, ratio, width));
}
