import { Drawer as DrawerPrimitive } from 'vaul';

import type { DrawerProps } from './Drawer.interface';

/**
 * Drawer – Root container for a slide-in panel from any screen edge. Wraps vaul.
 */
export default function Drawer({ children, ...domProps }: DrawerProps) {
  return (
    <DrawerPrimitive.Root data-slot="drawer" {...domProps}>
      {children}
    </DrawerPrimitive.Root>
  );
}
