import type { MessageHeaderVariants } from './MessageHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MessageHeaderProps
  extends MessageHeaderVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
