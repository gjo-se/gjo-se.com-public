import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu';

import type { ContextMenuRadioGroupProps } from './ContextMenuRadioGroup.interface';

/** ContextMenuRadioGroup – Groups radio items for single selection. */
export default function ContextMenuRadioGroup({
  children, ...domProps
}: ContextMenuRadioGroupProps) {
  return (
    <ContextMenuPrimitive.RadioGroup
      data-slot="context-menu-radio-group"
      {...domProps}
    >
      {children}
    </ContextMenuPrimitive.RadioGroup>
  );
}
