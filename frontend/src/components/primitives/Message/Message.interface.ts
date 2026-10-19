import type { MessageVariants } from './Message.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MessageProps
  extends MessageVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
