import type { BubbleReactionsVariants } from './BubbleReactions.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface BubbleReactionsProps extends BubbleReactionsVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
