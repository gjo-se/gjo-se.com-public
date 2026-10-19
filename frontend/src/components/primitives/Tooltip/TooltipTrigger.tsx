import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { cn } from '@src/lib/utils';

import { tooltipTriggerVariants } from './TooltipTrigger.variants';

import type { TooltipTriggerProps } from './TooltipTrigger.interface';

/** TooltipTrigger – Element that shows the tooltip on hover/focus. */
export default function TooltipTrigger({ children, ...domProps }: TooltipTriggerProps) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      className={cn(tooltipTriggerVariants())}
      {...domProps}
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
}
