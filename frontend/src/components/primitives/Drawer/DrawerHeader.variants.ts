import { cva, type VariantProps } from 'class-variance-authority';

export const drawerHeaderVariants = cva(
  'flex flex-col gap-0.5 p-4 md:gap-1.5 md:text-left group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center',
  { variants: {}, defaultVariants: {} },
);

export type DrawerHeaderVariants = VariantProps<typeof drawerHeaderVariants>;
