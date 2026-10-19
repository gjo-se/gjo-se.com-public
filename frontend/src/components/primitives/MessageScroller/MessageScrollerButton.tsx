import { MessageScroller as MessageScrollerPrimitive } from '@shadcn/react/message-scroller';

import Icon from '@src/components/primitives/Icon/Icon';
import { Button } from '@src/components/vendor/shadcn/button';
import { cn } from '@src/lib/utils';

import { messageScrollerButtonVariants } from './MessageScrollerButton.variants';

import type { MessageScrollerButtonProps } from './MessageScrollerButton.interface';

/** MessageScrollerButton – Scroll-to-end / scroll-to-start button. */
export default function MessageScrollerButton({
  direction = 'end', variant = 'secondary', size = 'icon-sm', children, ...domProps
}: MessageScrollerButtonProps) {
  return (
    <MessageScrollerPrimitive.Button
      data-slot="message-scroller-button"
      data-direction={direction}
      direction={direction}
      className={cn(messageScrollerButtonVariants())}
      render={<Button variant={variant as 'secondary'} size={size as 'icon-sm'} />}
      {...domProps}
    >
      {children ?? <><Icon name="chevron-down" /><span className="sr-only">{direction === 'end' ? 'Scroll to end' : 'Scroll to start'}</span></>}
    </MessageScrollerPrimitive.Button>
  );
}
