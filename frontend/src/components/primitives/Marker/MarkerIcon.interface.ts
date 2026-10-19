import type { MarkerIconVariants } from './MarkerIcon.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MarkerIconProps
  extends MarkerIconVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
