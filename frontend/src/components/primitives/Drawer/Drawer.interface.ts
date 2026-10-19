import type { DrawerVariants } from './Drawer.variants';

export interface DrawerProps extends DrawerVariants {
  children?: React.ReactNode;
  [key: string]: unknown;
}
