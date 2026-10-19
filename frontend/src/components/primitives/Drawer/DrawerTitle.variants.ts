import { cva, type VariantProps } from 'class-variance-authority';

export const drawerTitleVariants = cva('font-heading font-medium text-foreground', {
  variants: {}, defaultVariants: {},
});

export type DrawerTitleVariants = VariantProps<typeof drawerTitleVariants>;
