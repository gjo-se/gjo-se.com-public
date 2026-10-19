import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import type { PopoverProps } from './Popover.interface';

/**
 * Popover – Floating panel anchored to a trigger element.
 */
export default function Popover({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...domProps
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root
      data-slot="popover"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      {...domProps}
    >
      {children}
    </PopoverPrimitive.Root>
  );
}
