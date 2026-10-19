import type { BubbleVariants } from './Bubble.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface BubbleProps extends BubbleVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
