import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';

import { cn } from '@src/lib/utils';

import { messageScrollerViewportVariants } from './MessageScrollerViewport.variants';

import type { MessageScrollerViewportProps } from './MessageScrollerViewport.interface';

/** MessageScrollerViewport – Scrollable viewport for message content. */
export default function MessageScrollerViewport({ children, ...domProps }: MessageScrollerViewportProps) {
  return <MessageScrollerPrimitive.Viewport data-slot="message-scroller-viewport" className={cn(messageScrollerViewportVariants())} {...domProps}>{children}</MessageScrollerPrimitive.Viewport>;
}
