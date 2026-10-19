import { cn } from '@src/lib/utils';

import { bubbleReactionsVariants } from './BubbleReactions.variants';

import type { BubbleReactionsProps } from './BubbleReactions.interface';
/**
 *
 */
export default function BubbleReactions({ side = 'bottom', align = 'end', children, ...domProps }: BubbleReactionsProps) {
  return <div data-slot="bubble-reactions" data-align={align} data-side={side} className={cn(bubbleReactionsVariants({ side, align }))} {...domProps}>{children}</div>;
}
