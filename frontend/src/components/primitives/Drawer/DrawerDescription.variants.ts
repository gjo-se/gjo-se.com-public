import { cva, type VariantProps } from 'class-variance-authority';

export const drawerDescriptionVariants = cva('text-sm text-muted-foreground', {
  variants: {},
  defaultVariants: {},
});

export type DrawerDescriptionVariants = VariantProps<typeof drawerDescriptionVariants>;
