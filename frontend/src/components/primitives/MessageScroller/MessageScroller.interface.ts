import type { MessageScrollerVariants } from './MessageScroller.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface MessageScrollerProps extends MessageScrollerVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
