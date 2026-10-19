import { cva, type VariantProps } from 'class-variance-authority';

/** Banner-Chrome – mobil volle Breite am unteren Rand, ab `md` kompakte Karte unten links. */
export const cookieBannerVariants = cva(
  'fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface p-4 shadow-lg md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-lg md:border',
);

export type CookieBannerVariants = VariantProps<typeof cookieBannerVariants>;
