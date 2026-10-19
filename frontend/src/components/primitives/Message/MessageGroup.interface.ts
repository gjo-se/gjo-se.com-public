import type { MessageGroupVariants } from './MessageGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MessageGroupProps
  extends MessageGroupVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
