import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';

import { cn } from '@src/lib/utils';

import { bubbleContentVariants } from './BubbleContent.variants';

import type { BubbleContentProps } from './BubbleContent.interface';
/**
 *
 */
export default function BubbleContent({ render, ...props }: BubbleContentProps) {
  return useRender({ defaultTagName: 'div', props: mergeProps<'div'>({ className: cn(bubbleContentVariants()) }, props), render, state: { slot: 'bubble-content' } });
}
