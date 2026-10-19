import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { cn } from '@src/lib/utils';

import { popoverDescriptionVariants } from './PopoverDescription.variants';

import type { PopoverDescriptionProps } from './PopoverDescription.interface';

/** PopoverDescription – Accessible description text for the popover. */
export default function PopoverDescription({ children, ...domProps }: PopoverDescriptionProps) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn(popoverDescriptionVariants())}
      {...domProps}
    >
      {children}
    </PopoverPrimitive.Description>
  );
}
