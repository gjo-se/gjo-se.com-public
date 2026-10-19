import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import type { ContextMenuTriggerProps } from './ContextMenuTrigger.interface';

/** ContextMenuTrigger – Element that opens the context menu on right-click. */
export default function ContextMenuTrigger({ children, ...domProps }: ContextMenuTriggerProps) {
  return (
    <ContextMenuPrimitive.Trigger
      data-slot="context-menu-trigger"
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.Trigger>
  );
}
