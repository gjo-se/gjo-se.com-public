import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@src/lib/utils';

import { popoverTriggerVariants } from './PopoverTrigger.variants';

import type { PopoverTriggerProps } from './PopoverTrigger.interface';

/** PopoverTrigger – Button that toggles the popover. */
export default function PopoverTrigger({ children, ...domProps }: PopoverTriggerProps) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      className={cn(popoverTriggerVariants())}
      {...domProps}
    >
      {children}
    </PopoverPrimitive.Trigger>
  );
}
