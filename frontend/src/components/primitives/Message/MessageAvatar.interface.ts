import type { MessageAvatarVariants } from './MessageAvatar.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MessageAvatarProps
  extends MessageAvatarVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
