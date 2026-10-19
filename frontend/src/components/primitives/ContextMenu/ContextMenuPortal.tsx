import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import type { ContextMenuPortalProps } from './ContextMenuPortal.interface';

/** ContextMenuPortal – Portals context menu content to document body. */
export default function ContextMenuPortal({ children, ...domProps }: ContextMenuPortalProps) {
  return (
    <ContextMenuPrimitive.Portal
      data-slot="context-menu-portal"
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.Portal>
  );
}
