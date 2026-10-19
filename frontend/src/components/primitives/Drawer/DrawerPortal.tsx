import { Drawer as DrawerPrimitive } from 'vaul';

import type { DrawerPortalProps } from './DrawerPortal.interface';

/**
 * DrawerPortal – Portals drawer content into the document body to escape stacking contexts.
 */
export default function DrawerPortal({ children, ...domProps }: DrawerPortalProps) {
  return (
    <DrawerPrimitive.Portal data-slot="drawer-portal" {...domProps}>
      {children}
    </DrawerPrimitive.Portal>
  );
}
