import { Drawer as DrawerPrimitive } from 'vaul';

import type { DrawerCloseProps } from './DrawerClose.interface';

/**
 * DrawerClose – Button that programmatically closes the parent Drawer.
 */
export default function DrawerClose({ children, ...domProps }: DrawerCloseProps) {
  return (
    <DrawerPrimitive.Close data-slot="drawer-close" {...domProps}>
      {children}
    </DrawerPrimitive.Close>
  );
}
