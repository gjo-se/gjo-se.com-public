import type { ColorSwatchProps } from './ColorSwatch.interface';

/** Size → Tailwind-Klasse für den dekorativen Farbpunkt. */
export const SIZE_CLASSES: Record<NonNullable<ColorSwatchProps['size']>, string> = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
};
