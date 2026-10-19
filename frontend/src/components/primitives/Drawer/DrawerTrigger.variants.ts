import { cva, type VariantProps } from 'class-variance-authority';

export const drawerTriggerVariants = cva('', { variants: {}, defaultVariants: {} });
export type DrawerTriggerVariants = VariantProps<typeof drawerTriggerVariants>;
