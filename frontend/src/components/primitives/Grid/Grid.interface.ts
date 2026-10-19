import type { GridVariants } from './Grid.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface GridProps
  extends GridVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
