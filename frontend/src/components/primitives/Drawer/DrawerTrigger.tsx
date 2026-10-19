import { Drawer as DrawerPrimitive } from 'vaul';

import type { DrawerTriggerProps } from './DrawerTrigger.interface';

/**
 * DrawerTrigger – Element that opens the drawer when clicked.
 */
export default function DrawerTrigger({ children, ...domProps }: DrawerTriggerProps) {
  return (
    <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...domProps}>
      {children}
    </DrawerPrimitive.Trigger>
  );
}
