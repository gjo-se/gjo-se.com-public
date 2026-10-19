import { cva, type VariantProps } from 'class-variance-authority';

export const dialogOverlayVariants = cva(
  'fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type DialogOverlayVariants = VariantProps<typeof dialogOverlayVariants>;
