import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@src/lib/utils';

import { drawerContentVariants } from './DrawerContent.variants';
import DrawerOverlay from './DrawerOverlay';
import DrawerPortal from './DrawerPortal';


import type { DrawerContentProps } from './DrawerContent.interface';

/**
 * DrawerContent – Main content panel with drag handle.
 * Automatically renders overlay and portal. Supports all edge directions.
 */
export default function DrawerContent({ children, ...domProps }: DrawerContentProps) {
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(drawerContentVariants())}
        {...domProps}
      >
        <div className="mx-auto mt-4 hidden h-1.5 w-25 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}
