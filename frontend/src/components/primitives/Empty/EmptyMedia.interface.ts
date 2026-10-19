import type { EmptyMediaVariants } from './EmptyMedia.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface EmptyMediaProps
  extends EmptyMediaVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
