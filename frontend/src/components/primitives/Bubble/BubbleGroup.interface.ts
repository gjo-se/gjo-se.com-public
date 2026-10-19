import type { BubbleGroupVariants } from './BubbleGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface BubbleGroupProps extends BubbleGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
