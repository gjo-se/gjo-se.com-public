import { cva, type VariantProps } from 'class-variance-authority';

export const drawerOverlayVariants = cva(
  'fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
  { variants: {}, defaultVariants: {} },
);

export type DrawerOverlayVariants = VariantProps<typeof drawerOverlayVariants>;
