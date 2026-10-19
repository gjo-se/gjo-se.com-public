import { NavigationMenuItem as Item } from '@src/components/vendor/shadcn/navigation-menu';

import type { NavigationMenuItemProps } from './NavigationMenuItem.interface';

/**
 * NavigationMenuItem – Single item in a navigation menu list.
 */
export default function NavigationMenuItem({ children, ...domProps }: NavigationMenuItemProps) {
  return <Item data-slot="navigation-menu-item" {...domProps}>{children}</Item>;
}
