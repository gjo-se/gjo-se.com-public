import { cva, type VariantProps } from 'class-variance-authority';

export const drawerVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type DrawerVariants = VariantProps<typeof drawerVariants>;
