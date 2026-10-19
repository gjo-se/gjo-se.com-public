import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import type { ContextMenuSubProps } from './ContextMenuSub.interface';

/** ContextMenuSub – Nested sub-menu container. */
export default function ContextMenuSub({ children, ...domProps }: ContextMenuSubProps) {
  return (
    <ContextMenuPrimitive.SubmenuRoot
      data-slot="context-menu-sub"
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.SubmenuRoot>
  );
}
