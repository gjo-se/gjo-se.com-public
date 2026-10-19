import { cn } from '@src/lib/utils';

import { messageContentVariants } from './MessageContent.variants';

import type { MessageContentProps } from './MessageContent.interface';

/**
 *
 */
export default function MessageContent({ children, ...domProps }: MessageContentProps) {
  return (
    <div data-slot="message-content" className={cn(messageContentVariants())} {...domProps}>
      {children}
    </div>
  );
}
