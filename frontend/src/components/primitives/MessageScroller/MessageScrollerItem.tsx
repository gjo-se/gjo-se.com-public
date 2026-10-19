import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';

import { cn } from '@src/lib/utils';

import { messageScrollerItemVariants } from './MessageScrollerItem.variants';

import type { MessageScrollerItemProps } from './MessageScrollerItem.interface';

/** MessageScrollerItem – Individual message inside the scroller. */
export default function MessageScrollerItem({ scrollAnchor = false, children, ...domProps }: MessageScrollerItemProps) {
  return <MessageScrollerPrimitive.Item data-slot="message-scroller-item" scrollAnchor={scrollAnchor} className={cn(messageScrollerItemVariants())} {...domProps}>{children}</MessageScrollerPrimitive.Item>;
}
