import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import type { MenubarRadioItemProps } from './MenubarRadioItem.interface';

/**
 *
 */
export default function MenubarRadioItem({
  children, inset, value, ...props
}: MenubarRadioItemProps) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="menubar-radio-item"
      data-inset={inset}
      value={value}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-2 pl-8 text-sm outline-hidden select-none',
        'focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground',
        'data-inset:pl-8 data-disabled:pointer-events-none data-disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      )}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4">
        <MenuPrimitive.RadioItemIndicator>
          <Icon name="check" />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}
