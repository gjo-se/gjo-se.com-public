import { Menubar as MenubarPrimitive } from '@base-ui/react/menubar';

import { cn } from '@src/lib/utils';

import { menubarVariants } from './Menubar.variants';

import type { MenubarProps } from './Menubar.interface';

/**
 * Menubar – Horizontal menu bar for desktop application menus.
 */
export default function Menubar({ children, ...domProps }: MenubarProps) {
  return (
    <MenubarPrimitive
      data-slot="menubar"
      className={cn(menubarVariants())}
      {...domProps}
    >
      {children}
    </MenubarPrimitive>
  );
}
