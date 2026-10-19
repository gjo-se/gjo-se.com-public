import { cva, type VariantProps } from 'class-variance-authority';

export const drawerPortalVariants = cva('', { variants: {}, defaultVariants: {} });
export type DrawerPortalVariants = VariantProps<typeof drawerPortalVariants>;
