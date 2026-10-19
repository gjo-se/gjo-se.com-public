import { NavigationMenuLink as Link } from '@src/components/vendor/shadcn/navigation-menu';

import type { NavigationMenuLinkProps } from './NavigationMenuLink.interface';

/**
 * NavigationMenuLink – Link element inside a navigation menu item.
 */
export default function NavigationMenuLink({ children, ...domProps }: NavigationMenuLinkProps) {
  return <Link data-slot="navigation-menu-link" {...domProps}>{children}</Link>;
}
