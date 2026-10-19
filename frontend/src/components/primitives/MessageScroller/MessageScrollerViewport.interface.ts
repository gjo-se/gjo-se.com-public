import type { MessageScrollerViewportVariants } from './MessageScrollerViewport.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface MessageScrollerViewportProps extends MessageScrollerViewportVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
