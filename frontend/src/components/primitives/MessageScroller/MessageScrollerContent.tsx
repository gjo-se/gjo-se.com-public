import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';

import { cn } from '@src/lib/utils';

import { messageScrollerContentVariants } from './MessageScrollerContent.variants';

import type { MessageScrollerContentProps } from './MessageScrollerContent.interface';

/** MessageScrollerContent – Message content area with auto-spacing. */
export default function MessageScrollerContent({ children, ...domProps }: MessageScrollerContentProps) {
  return <MessageScrollerPrimitive.Content data-slot="message-scroller-content" className={cn(messageScrollerContentVariants())} {...domProps}>{children}</MessageScrollerPrimitive.Content>;
}
