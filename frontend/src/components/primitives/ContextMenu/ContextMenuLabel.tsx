import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import { cn } from '@src/lib/utils';

import type { ContextMenuLabelProps } from './ContextMenuLabel.interface';

/** ContextMenuLabel – Non-interactive heading inside a context menu. */
export default function ContextMenuLabel({
  inset, children, ...domProps
}: ContextMenuLabelProps) {
  return (
    <ContextMenuPrimitive.GroupLabel
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn('px-2 py-1.5 text-sm font-medium data-inset:pl-8')}
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.GroupLabel>
  );
}
