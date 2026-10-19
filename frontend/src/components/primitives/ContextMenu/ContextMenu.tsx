import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import type { ContextMenuProps } from './ContextMenu.interface';

/**
 * ContextMenu – Right-click contextual menu.
 */
export default function ContextMenu({ ...domProps }: ContextMenuProps) {
  return (
    <ContextMenuPrimitive.Root data-slot="context-menu" {...domProps} />
  );
}
