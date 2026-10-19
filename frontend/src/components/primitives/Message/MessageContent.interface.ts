import type { MessageContentVariants } from './MessageContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MessageContentProps
  extends MessageContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
