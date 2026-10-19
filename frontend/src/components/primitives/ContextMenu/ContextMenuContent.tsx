import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import ContextMenuPortal from './ContextMenuPortal';

import type { ContextMenuContentProps } from './ContextMenuContent.interface';

/** ContextMenuContent – Dropdown panel with portal, positioner, and popup. */
export default function ContextMenuContent({
  sideOffset = 8, align = 'start', alignOffset = -4, children, ...domProps
}: ContextMenuContentProps) {
  return (
    <ContextMenuPortal>
      <ContextMenuPrimitive.Positioner
        align={align as 'center' | 'end' | 'start'}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          {...domProps}
        >
          {children}
        </ContextMenuPrimitive.Popup>
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPortal>
  );
}
