import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { menubarCheckboxItemVariants } from './MenubarCheckboxItem.variants';

import type { MenubarCheckboxItemProps } from './MenubarCheckboxItem.interface';

/**
 *
 */
export default function MenubarCheckboxItem({
  children, checked, inset, ...props
}: MenubarCheckboxItemProps) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="menubar-checkbox-item"
      data-inset={inset}
      className={cn(menubarCheckboxItemVariants())}
      checked={checked}
      {...props}
    >
      <span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4">
        <MenuPrimitive.CheckboxItemIndicator>
          <Icon name="check" />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}
