import { cn } from '@src/lib/utils';

import { gridVariants } from './Grid.variants';

import type { GridProps } from './Grid.interface';

/**
 * Grid – Responsive CSS Grid container with controlled column counts and gaps.
 */
export default function Grid({ cols = 1, gap = 4, children, ...domProps }: GridProps) {
  return (
    <div className={cn(gridVariants({ cols, gap }))} {...domProps}>
      {children}
    </div>
  );
}
