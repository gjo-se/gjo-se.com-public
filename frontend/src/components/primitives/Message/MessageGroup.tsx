import { cn } from '@src/lib/utils';

import { messageGroupVariants } from './MessageGroup.variants';

import type { MessageGroupProps } from './MessageGroup.interface';

/**
 *
 */
export default function MessageGroup({ children, ...domProps }: MessageGroupProps) {
  return (
    <div data-slot="message-group" className={cn(messageGroupVariants())} {...domProps}>
      {children}
    </div>
  );
}
