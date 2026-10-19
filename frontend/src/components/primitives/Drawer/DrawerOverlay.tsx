import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@src/lib/utils';

import { drawerOverlayVariants } from './DrawerOverlay.variants';

import type { DrawerOverlayProps } from './DrawerOverlay.interface';

/**
 * DrawerOverlay – Semi-transparent backdrop behind the drawer. Animates in/out on open/close.
 */
export default function DrawerOverlay({ ...domProps }: DrawerOverlayProps) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(drawerOverlayVariants())}
      {...domProps}
    />
  );
}
