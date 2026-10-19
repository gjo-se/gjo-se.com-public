import { cn } from '@src/lib/utils';

import { popoverHeaderVariants } from './PopoverHeader.variants';

import type { PopoverHeaderProps } from './PopoverHeader.interface';

/** PopoverHeader – Header section of a popover, typically containing PopoverTitle and PopoverDescription. */
export default function PopoverHeader({ children, ...domProps }: PopoverHeaderProps) {
  return (
    <div
      data-slot="popover-header"
      className={cn(popoverHeaderVariants())}
      {...domProps}
    >
      {children}
    </div>
  );
}
