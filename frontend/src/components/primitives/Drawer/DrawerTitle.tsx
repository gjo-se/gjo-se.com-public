import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@src/lib/utils';

import { drawerTitleVariants } from './DrawerTitle.variants';

import type { DrawerTitleProps } from './DrawerTitle.interface';

/**
 * DrawerTitle – Accessible heading for the drawer. Rendered inside DrawerHeader.
 */
export default function DrawerTitle({ children, ...domProps }: DrawerTitleProps) {
  return (
    <DrawerPrimitive.Title data-slot="drawer-title" className={cn(drawerTitleVariants())} {...domProps}>
      {children}
    </DrawerPrimitive.Title>
  );
}
