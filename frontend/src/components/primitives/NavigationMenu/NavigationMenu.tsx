import { NavigationMenu as NavigationMenuPrimitive } from '@src/components/vendor/shadcn/navigation-menu';
import { cn } from '@src/lib/utils';

import { navigationMenuVariants } from './NavigationMenu.variants';

import type { NavigationMenuProps } from './NavigationMenu.interface';

/**
 * NavigationMenu – Horizontal navigation menu with dropdown support.
 */
export default function NavigationMenu({
  align,
  children,
  ...domProps
}: NavigationMenuProps) {
  return (
    <NavigationMenuPrimitive
      data-slot="navigation-menu"
      align={align}
      className={cn(navigationMenuVariants())}
      {...domProps}
    >
      {children}
    </NavigationMenuPrimitive>
  );
}
