import type { ScrollBarVariants } from './ScrollBar.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ScrollBarProps extends ScrollBarVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { orientation?: 'horizontal' | 'vertical'; }
