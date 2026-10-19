import { NavigationMenu } from '@base-ui/react/navigation-menu';

import { cn } from '@src/lib/utils';

/**
 * NavigationMenuPositioner – Positions the navigation menu popup.
 */
export default function NavigationMenuPositioner({
  side = 'bottom',
  sideOffset = 8,
  align = 'start',
  alignOffset = 0,
  ...domProps
}: Record<string, unknown>) {
  return (
    <NavigationMenu.Portal>
      <NavigationMenu.Positioner
        side={side as 'bottom' | 'left' | 'right' | 'top'}
        sideOffset={sideOffset as number}
        align={align as 'center' | 'end' | 'start'}
        alignOffset={alignOffset as number}
        className={cn(
          'isolate z-50 h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) transition-all duration-350 ease-nav data-instant:transition-none data-[side=bottom]:before:-top-2.5 data-[side=bottom]:before:right-0 data-[side=bottom]:before:left-0',
          (domProps as Record<string, unknown>).className as string,
        )}
        {...domProps}
      />
    </NavigationMenu.Portal>
  );
}
