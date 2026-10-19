import type { MessageFooterVariants } from './MessageFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MessageFooterProps
  extends MessageFooterVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
