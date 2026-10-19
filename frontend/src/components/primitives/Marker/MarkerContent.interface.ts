import type { MarkerContentVariants } from './MarkerContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MarkerContentProps
  extends MarkerContentVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
