import { NavigationMenuTrigger as Trigger } from '@src/components/vendor/shadcn/navigation-menu';
import { cn } from '@src/lib/utils';

import { navigationMenuTriggerVariants } from './NavigationMenuTrigger.variants';

import type { NavigationMenuTriggerProps } from './NavigationMenuTrigger.interface';

/**
 * NavigationMenuTrigger – Toggle button that opens a navigation menu dropdown.
 */
export default function NavigationMenuTrigger({
  children,
  ...domProps
}: NavigationMenuTriggerProps) {
  return (
    <Trigger
      data-slot="navigation-menu-trigger"
      className={cn(navigationMenuTriggerVariants())}
      {...domProps}
    >
      {children}
    </Trigger>
  );
}
