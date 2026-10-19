import type { DirectionVariants } from './Direction.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DirectionProps
  extends DirectionVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  direction?: 'ltr' | 'rtl';
  children?: React.ReactNode;
}
