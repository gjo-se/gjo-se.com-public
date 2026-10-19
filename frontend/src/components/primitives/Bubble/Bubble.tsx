import { cn } from '@src/lib/utils';

import { bubbleVariants } from './Bubble.variants';

import type { BubbleProps } from './Bubble.interface';

/**
 * Bubble – Chat message bubble with variant styling.
 */
export default function Bubble({
  variant = 'default',
  ...domProps
}: BubbleProps) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      className={cn(bubbleVariants({ variant }))}
      {...domProps}
    />
  );
}
