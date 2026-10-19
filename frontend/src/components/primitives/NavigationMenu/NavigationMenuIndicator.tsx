import { NavigationMenu } from '@base-ui/react/navigation-menu';

import { cn } from '@src/lib/utils';

/**
 * NavigationMenuIndicator – Arrow indicator for navigation menu.
 */
export default function NavigationMenuIndicator({ ...domProps }: Record<string, unknown>) {
  return (
    <NavigationMenu.Icon
      data-slot="navigation-menu-indicator"
      className={cn(
        'top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in',
        (domProps as Record<string, unknown>).className as string,
      )}
      {...domProps}
    >
      <div className="relative top-nav-indicator h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
    </NavigationMenu.Icon>
  );
}
