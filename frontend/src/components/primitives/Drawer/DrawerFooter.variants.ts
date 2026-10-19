import { cva, type VariantProps } from 'class-variance-authority';

export const drawerFooterVariants = cva('mt-auto flex flex-col gap-2 p-4', {
  variants: {}, defaultVariants: {},
});

export type DrawerFooterVariants = VariantProps<typeof drawerFooterVariants>;
