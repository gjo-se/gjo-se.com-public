import { cn } from '@src/lib/utils';

import { messageAvatarVariants } from './MessageAvatar.variants';

import type { MessageAvatarProps } from './MessageAvatar.interface';

/**
 *
 */
export default function MessageAvatar({ children, ...domProps }: MessageAvatarProps) {
  return (
    <div data-slot="message-avatar" className={cn(messageAvatarVariants())} {...domProps}>
      {children}
    </div>
  );
}
