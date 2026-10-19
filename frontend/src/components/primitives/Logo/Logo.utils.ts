import ComboSvg from '@src/assets/brand/combo.svg?react';
import FaviconSvg from '@src/assets/brand/favicon.svg?react';
import WordmarkSvg from '@src/assets/brand/wordmark.svg?react';

/** Maps a logo variant to its brand SVG component. */
export const LOGO_SVGS = {
  wordmark: WordmarkSvg,
  combo: ComboSvg,
  favicon: FaviconSvg,
} as const;
