import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import type { ContextMenuRadioItemProps } from './ContextMenuRadioItem.interface';

/** ContextMenuRadioItem – Single-select radio item with indicator. */
export default function ContextMenuRadioItem({
  value, inset, children, ...domProps
}: ContextMenuRadioItemProps) {
  return (
    <ContextMenuPrimitive.RadioItem
      data-slot="context-menu-radio-item"
      data-inset={inset}
      value={value}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-sm',
        'py-1.5 pr-2 pl-8 text-sm outline-hidden select-none',
        'focus:bg-accent data-inset:pl-8',
      )}
      {...domProps}
    >
      <span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.RadioItemIndicator>
          <Icon name="check" />
        </ContextMenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}
