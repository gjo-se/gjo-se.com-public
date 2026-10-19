import type { MessageScrollerContentVariants } from './MessageScrollerContent.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface MessageScrollerContentProps extends MessageScrollerContentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
