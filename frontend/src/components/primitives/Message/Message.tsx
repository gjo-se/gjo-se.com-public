import { cn } from '@src/lib/utils';

import { messageVariants } from './Message.variants';

import type { MessageProps } from './Message.interface';

/**
 * Message – Chat message bubble with alignment control.
 */
export default function Message({
  align = 'start',
  children,
  ...domProps
}: MessageProps) {
  return (
    <div
      data-slot="message"
      data-align={align}
      className={cn(messageVariants({ align }))}
      {...domProps}
    >
      {children}
    </div>
  );
}
