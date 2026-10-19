import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import type { TooltipProps } from './Tooltip.interface';

/**
 * Tooltip – Floating label that appears on hover/focus of a trigger element.
 */
export default function Tooltip({
  open,
  defaultOpen,
  onOpenChange,
  children,
  ...domProps
}: TooltipProps) {
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      {...domProps}
    >
      {children}
    </TooltipPrimitive.Root>
  );
}
