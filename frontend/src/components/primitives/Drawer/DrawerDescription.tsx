import { Drawer as DrawerPrimitive } from 'vaul';

import { cn } from '@src/lib/utils';

import { drawerDescriptionVariants } from './DrawerDescription.variants';

import type { DrawerDescriptionProps } from './DrawerDescription.interface';

/**
 * DrawerDescription – Accessible description text for screen readers. Paired with DrawerTitle inside DrawerHeader.
 */
export default function DrawerDescription({ children, ...domProps }: DrawerDescriptionProps) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn(drawerDescriptionVariants())}
      {...domProps}
    >
      {children}
    </DrawerPrimitive.Description>
  );
}
