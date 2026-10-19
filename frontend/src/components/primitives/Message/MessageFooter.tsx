import { cn } from '@src/lib/utils';

import { messageFooterVariants } from './MessageFooter.variants';

import type { MessageFooterProps } from './MessageFooter.interface';

/**
 *
 */
export default function MessageFooter({ children, ...domProps }: MessageFooterProps) {
  return (
    <div data-slot="message-footer" className={cn(messageFooterVariants())} {...domProps}>
      {children}
    </div>
  );
}
