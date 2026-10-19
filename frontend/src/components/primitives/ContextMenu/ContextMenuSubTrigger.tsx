import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import type { ContextMenuSubTriggerProps } from './ContextMenuSubTrigger.interface';

/** ContextMenuSubTrigger – Opens a nested sub-menu. Shows chevron-right icon. */
export default function ContextMenuSubTrigger({
  inset, children, ...domProps
}: ContextMenuSubTriggerProps) {
  return (
    <ContextMenuPrimitive.SubmenuTrigger
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        'flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5',
        'text-sm outline-hidden select-none focus:bg-accent',
        'data-open:bg-accent data-inset:pl-8',
      )}
      {...domProps}
    >
      {children}
      <Icon name="chevron-right" />
    </ContextMenuPrimitive.SubmenuTrigger>
  );
}
