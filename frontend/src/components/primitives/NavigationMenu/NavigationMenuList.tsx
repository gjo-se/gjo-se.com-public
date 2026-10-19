import { NavigationMenuList as List } from '@src/components/vendor/shadcn/navigation-menu';

import type { NavigationMenuListProps } from './NavigationMenuList.interface';

/**
 * NavigationMenuList – List container for navigation menu items.
 */
export default function NavigationMenuList({ children, ...domProps }: NavigationMenuListProps) {
  return <List data-slot="navigation-menu-list" {...domProps}>{children}</List>;
}
