import { cn } from '@src/lib/utils';

import { bubbleGroupVariants } from './BubbleGroup.variants';

import type { BubbleGroupProps } from './BubbleGroup.interface';
/**
 *
 */
export default function BubbleGroup({ children, ...domProps }: BubbleGroupProps) {
  return <div data-slot="bubble-group" className={cn(bubbleGroupVariants())} {...domProps}>{children}</div>;
}
