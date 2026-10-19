import { NavigationMenuContent as Content } from '@src/components/vendor/shadcn/navigation-menu';

import type { NavigationMenuContentProps } from './NavigationMenuContent.interface';

/**
 * NavigationMenuContent – Content panel for navigation menu dropdowns.
 */
export default function NavigationMenuContent({ children, ...domProps }: NavigationMenuContentProps) {
  return <Content data-slot="navigation-menu-content" {...domProps}>{children}</Content>;
}
