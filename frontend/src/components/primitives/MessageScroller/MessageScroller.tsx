import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';

import { cn } from '@src/lib/utils';

import { messageScrollerVariants } from './MessageScroller.variants';

import type { MessageScrollerProps } from './MessageScroller.interface';

/** MessageScroller – Root container for scrollable message list with auto-scroll. */
export default function MessageScroller({ children, ...domProps }: MessageScrollerProps) {
  return <MessageScrollerPrimitive.Root data-slot="message-scroller" className={cn(messageScrollerVariants())} {...domProps}>{children}</MessageScrollerPrimitive.Root>;
}
