import type { EmptyContentVariants } from './EmptyContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface EmptyContentProps
  extends EmptyContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
