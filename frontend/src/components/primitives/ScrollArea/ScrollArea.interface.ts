import type { ScrollAreaVariants } from './ScrollArea.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ScrollAreaProps extends ScrollAreaVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
