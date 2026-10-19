import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import { cn } from '@src/lib/utils';

import type { ContextMenuItemProps } from './ContextMenuItem.interface';

/** ContextMenuItem – Interactive item inside a context menu. Supports variant. */
export default function ContextMenuItem({
  variant = 'default', inset, children, ...domProps
}: ContextMenuItemProps) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        'group/context-menu-item relative flex cursor-default items-center',
        'gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none',
        'focus:bg-accent focus:text-accent-foreground',
        'data-inset:pl-8 data-[variant=destructive]:text-destructive',
      )}
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.Item>
  );
}
