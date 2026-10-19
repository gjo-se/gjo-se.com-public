import type { EmptyTitleVariants } from './EmptyTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface EmptyTitleProps
  extends EmptyTitleVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
