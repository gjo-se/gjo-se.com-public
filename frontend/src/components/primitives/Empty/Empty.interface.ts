import type { EmptyVariants } from './Empty.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface EmptyProps
  extends EmptyVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
