import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import { cn } from '@src/lib/utils';

import type { ContextMenuSeparatorProps } from './ContextMenuSeparator.interface';

/** ContextMenuSeparator – Horizontal divider between context menu items. */
export default function ContextMenuSeparator({ ...domProps }: ContextMenuSeparatorProps) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border')}
      {...domProps}
    />
  );
}
