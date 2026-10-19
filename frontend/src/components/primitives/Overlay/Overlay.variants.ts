import { cva, type VariantProps } from 'class-variance-authority';

export const overlayVariants = cva('fixed inset-0 isolate z-50', {
  variants: {
    variant: {
      dialog: 'bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
      loading: 'bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs flex items-center justify-center',
    },
  },
  defaultVariants: {
    variant: 'dialog',
  },
});

export type OverlayVariants = VariantProps<typeof overlayVariants>;
