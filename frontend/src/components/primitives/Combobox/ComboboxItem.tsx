import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { comboboxItemVariants } from './ComboboxItem.variants';

import type { ComboboxItemProps } from './ComboboxItem.interface';
/**
 *
 */
export default function ComboboxItem({ children, ...domProps }: ComboboxItemProps) {
  return (
    <ComboboxPrimitive.Item data-slot="combobox-item" className={cn(comboboxItemVariants())} {...domProps}>
      {children}
      <ComboboxPrimitive.ItemIndicator render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}>
        <Icon name="check" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}
