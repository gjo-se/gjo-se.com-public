import { cva, type VariantProps } from 'class-variance-authority';

/** Äußere Header-Leiste (Container-Rhythmus, feste Höhe, Ausrichtung). */
export const headerBarVariants = cva(
  'mx-auto flex h-16 max-w-6xl items-center justify-between px-6',
);

/** Utility-Menü-Popover (Fläche, Rand, Schatten). */
export const headerUtilityMenuVariants = cva(
  'absolute right-0 top-full z-utility-menu mt-2 min-w-menu rounded-md border border-border-light bg-surface p-1 shadow-lg',
);

/** Menü-Sektion mit oberer Haarlinie (Utility-Menü). */
export const headerMenuSectionVariants = cva('border-t border-border-light py-1');

/** Drawer-Sektion mit oberer Haarlinie. */
export const headerDrawerSectionVariants = cva('border-t border-border-light pt-4');

export type HeaderVariants = VariantProps<typeof headerBarVariants>;
