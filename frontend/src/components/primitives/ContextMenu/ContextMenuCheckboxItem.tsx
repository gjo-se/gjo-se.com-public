import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import type { ContextMenuCheckboxItemProps } from './ContextMenuCheckboxItem.interface';

/** ContextMenuCheckboxItem – Togglable checked item with indicator icon. */
export default function ContextMenuCheckboxItem({
  checked, inset, children, ...domProps
}: ContextMenuCheckboxItemProps) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      data-slot="context-menu-checkbox-item"
      data-inset={inset}
      checked={checked}
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-sm py-1.5',
        'pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent',
        'data-inset:pl-8',
      )}
      {...domProps}
    >
      <span className="pointer-events-none absolute left-2 flex size-4 items-center justify-center">
        <ContextMenuPrimitive.CheckboxItemIndicator>
          <Icon name="check" />
        </ContextMenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}
