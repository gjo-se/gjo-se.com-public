import { cn } from '@src/lib/utils';

import { messageHeaderVariants } from './MessageHeader.variants';

import type { MessageHeaderProps } from './MessageHeader.interface';

/**
 *
 */
export default function MessageHeader({ children, ...domProps }: MessageHeaderProps) {
  return (
    <div data-slot="message-header" className={cn(messageHeaderVariants())} {...domProps}>
      {children}
    </div>
  );
}
