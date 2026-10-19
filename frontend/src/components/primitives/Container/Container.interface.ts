import type { ContainerVariants } from './Container.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ContainerProps
  extends ContainerVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
