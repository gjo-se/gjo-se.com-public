import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@src/lib/utils';

import { popoverTitleVariants } from './PopoverTitle.variants';

import type { PopoverTitleProps } from './PopoverTitle.interface';

/** PopoverTitle – Accessible heading for the popover. */
export default function PopoverTitle({ children, ...domProps }: PopoverTitleProps) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn(popoverTitleVariants())}
      {...domProps}
    >
      {children}
    </PopoverPrimitive.Title>
  );
}
