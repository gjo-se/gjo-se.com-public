import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import type { ContextMenuGroupProps } from './ContextMenuGroup.interface';

/** ContextMenuGroup – Groups related ContextMenuItems visually. */
export default function ContextMenuGroup({ children, ...domProps }: ContextMenuGroupProps) {
  return (
    <ContextMenuPrimitive.Group
      data-slot="context-menu-group"
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.Group>
  );
}
