import { cn } from '@src/lib/utils';

import { groupVariants } from './Group.variants';

import type { GroupProps } from './Group.interface';

/**
 * Group – Horizontal flex container with controlled gap, alignment, and wrapping.
 */
export default function Group({
  direction = 'row',
  fullHeight = false,
  fullWidth = false,
  gap = 2,
  align = 'center',
  justify = 'start',
  wrap = 'wrap',
  children,
  ...domProps
}: GroupProps) {
  return (
    <div className={cn(groupVariants({ direction, fullHeight, fullWidth, gap, align, justify, wrap }))} {...domProps}>
      {children}
    </div>
  );
}
