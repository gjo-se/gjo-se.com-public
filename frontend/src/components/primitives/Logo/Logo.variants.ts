import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Größen-Varianten für das Logo – setzt die HÖHE des SVG; die Breite
 * skaliert automatisch über das viewBox-Seitenverhältnis (preserveAspectRatio).
 */
export const logoVariants = cva('', {
  variants: {
    size: {
      xs: 'h-3',
      sm: 'h-4',
      md: 'h-5',
      lg: 'h-6',
      xl: 'h-8',
      '2xl': 'h-10',
      '3xl': 'h-12',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export type LogoVariants = VariantProps<typeof logoVariants>;
