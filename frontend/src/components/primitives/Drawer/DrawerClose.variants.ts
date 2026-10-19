import { cva, type VariantProps } from 'class-variance-authority';

export const drawerCloseVariants = cva('', { variants: {}, defaultVariants: {} });
export type DrawerCloseVariants = VariantProps<typeof drawerCloseVariants>;
