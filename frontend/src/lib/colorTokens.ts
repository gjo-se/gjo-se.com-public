/**
 * ColorToken – central color palette derived from backend ColorToken(StrEnum).
 *
 * Palette: all 13 tokens are derived from the S1 family
 * (Charcoal/Copper design). The stored token value is a stable DB identity;
 * the canonical english family + hex is provided via COLOR_TOKEN_META and is
 * the single vocabulary used across charts and the tag/status UI:
 *
 *   rust #B0553F · copper #C97A4A · gold #E0A458 · olive #9B7E46
 *   sage #7FA98E · mauve #A98BA8 · slate #7A8CA0 · gray #6B6B63
 *   + lightness variants: gold-light, sage-dark, mauve-light,
 *     slate-dark, slate-light.
 *
 * CSS values live in `index.css` (`--color-tag-*`, light + dark); this map only
 * binds token → utility classes.
 *
 * lib/ is a Leaf Node – MUST NOT import anything from the project.
 */

export type ColorToken =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime'
  | 'green' | 'teal' | 'cyan' | 'sky' | 'blue'
  | 'violet' | 'pink' | 'gray';

export interface ColorTokenCSS {
  /** Soft badge background (S1 base at 15 %), e.g. "bg-tag-red/15". */
  bg: string;
  /** Readable badge text per theme, e.g. "text-tag-red-text". */
  text: string;
  /** Badge border (S1 base at 45 %), e.g. "border-tag-red/45". */
  border: string;
  /** Ring variant of the border color (static literal for Tailwind JIT). */
  ring: string;
  /** S1 family value of the token (dark-theme dot), e.g. "#B0553F". */
  hex: string;
  /** Solid dot/swatch background, e.g. "bg-tag-red". */
  dot: string;
}

/**
 * Maps every ColorToken to Tailwind CSS classes and the S1 hex value.
 *
 * MUST use string literals (not dynamic construction) so Tailwind JIT
 * detects the classes at build time.
 */
export const COLOR_TOKEN_CSS: Record<ColorToken, ColorTokenCSS> = {
  red:    { bg: 'bg-tag-red/15',    text: 'text-tag-red-text',    border: 'border-tag-red/45',    ring: 'ring-tag-red/45',    hex: '#B0553F', dot: 'bg-tag-red'    },
  orange: { bg: 'bg-tag-orange/15', text: 'text-tag-orange-text', border: 'border-tag-orange/45', ring: 'ring-tag-orange/45', hex: '#C97A4A', dot: 'bg-tag-orange' },
  amber:  { bg: 'bg-tag-amber/15',  text: 'text-tag-amber-text',  border: 'border-tag-amber/45',  ring: 'ring-tag-amber/45',  hex: '#E0A458', dot: 'bg-tag-amber'  },
  yellow: { bg: 'bg-tag-yellow/15', text: 'text-tag-yellow-text', border: 'border-tag-yellow/45', ring: 'ring-tag-yellow/45', hex: '#EFC283', dot: 'bg-tag-yellow' },
  lime:   { bg: 'bg-tag-lime/15',   text: 'text-tag-lime-text',   border: 'border-tag-lime/45',   ring: 'ring-tag-lime/45',   hex: '#9B7E46', dot: 'bg-tag-lime'   },
  green:  { bg: 'bg-tag-green/15',  text: 'text-tag-green-text',  border: 'border-tag-green/45',  ring: 'ring-tag-green/45',  hex: '#7FA98E', dot: 'bg-tag-green'  },
  teal:   { bg: 'bg-tag-teal/15',   text: 'text-tag-teal-text',   border: 'border-tag-teal/45',   ring: 'ring-tag-teal/45',   hex: '#538068', dot: 'bg-tag-teal'   },
  cyan:   { bg: 'bg-tag-cyan/15',   text: 'text-tag-cyan-text',   border: 'border-tag-cyan/45',   ring: 'ring-tag-cyan/45',   hex: '#576B7F', dot: 'bg-tag-cyan'   },
  sky:    { bg: 'bg-tag-sky/15',    text: 'text-tag-sky-text',    border: 'border-tag-sky/45',    ring: 'ring-tag-sky/45',    hex: '#95A7BB', dot: 'bg-tag-sky'    },
  blue:   { bg: 'bg-tag-blue/15',   text: 'text-tag-blue-text',   border: 'border-tag-blue/45',   ring: 'ring-tag-blue/45',   hex: '#7A8CA0', dot: 'bg-tag-blue'   },
  violet: { bg: 'bg-tag-violet/15', text: 'text-tag-violet-text', border: 'border-tag-violet/45', ring: 'ring-tag-violet/45', hex: '#A98BA8', dot: 'bg-tag-violet' },
  pink:   { bg: 'bg-tag-pink/15',   text: 'text-tag-pink-text',   border: 'border-tag-pink/45',   ring: 'ring-tag-pink/45',   hex: '#C3A7C0', dot: 'bg-tag-pink'   },
  gray:   { bg: 'bg-tag-gray/15',   text: 'text-tag-gray-text',   border: 'border-tag-gray/45',   ring: 'ring-tag-gray/45',   hex: '#6B6B63', dot: 'bg-tag-gray'   },
} as const;

/**
 * Canonical english family name per token (S1 vocabulary) + the unambiguous hex.
 * This is the SINGLE vocabulary shared by charts and the tag/status picker, so a
 * color is always addressable as "family + hex" (e.g. sage #7FA98E), never by
 * ambiguous legacy names. (Stored token value stays the stable DB identity.)
 */
export const COLOR_TOKEN_META: Record<ColorToken, { label: string; hex: string }> = {  red:    { label: 'rust',    hex: '#B0553F' },
  orange: { label: 'copper',  hex: '#C97A4A' },
  amber:  { label: 'gold',    hex: '#E0A458' },
  yellow: { label: 'gold-light', hex: '#EFC283' },
  lime:   { label: 'olive',   hex: '#9B7E46' },
  green:  { label: 'sage',    hex: '#7FA98E' },
  teal:   { label: 'sage-dark', hex: '#538068' },
  cyan:   { label: 'slate-dark', hex: '#576B7F' },
  sky:    { label: 'slate-light', hex: '#95A7BB' },
  blue:   { label: 'slate',   hex: '#7A8CA0' },
  violet: { label: 'mauve',   hex: '#A98BA8' },
  pink:   { label: 'mauve-light', hex: '#C3A7C0' },
  gray:   { label: 'gray',    hex: '#6B6B63' },
} as const;

/**
 * Returns the solid Tailwind background class for a given color token, or the
 * gray dot as fallback for unknown values (dots, swatches, icon fallbacks).
 *
 * @param token - A color token value or arbitrary string.
 * @returns A Tailwind `bg-*` class for the token's solid dot color.
 */
export function getColorBg(token: string): string {
  const css = COLOR_TOKEN_CSS[token as ColorToken];
  return css ? css.dot : COLOR_TOKEN_CSS.gray.dot;
}
