import { cn } from '@src/lib/utils';

import { drawerHeaderVariants } from './DrawerHeader.variants';

import type { DrawerHeaderProps } from './DrawerHeader.interface';

/**
 * DrawerHeader – Title and description area inside a DrawerContent. Centers text for bottom/top directions.
 */
export default function DrawerHeader({ children, ...domProps }: DrawerHeaderProps) {
  return <div data-slot="drawer-header" className={cn(drawerHeaderVariants())} {...domProps}>{children}</div>;
}
