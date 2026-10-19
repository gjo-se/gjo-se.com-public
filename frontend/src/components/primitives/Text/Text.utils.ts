import type { TextProps } from './Text.interface';

/** Statisches `line-clamp-N`-Mapping (Tailwind purged nur statische Strings). */
export const LINE_CLAMP_CLASS: Record<NonNullable<TextProps['lineClamp']>, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
  6: 'line-clamp-6',
};
