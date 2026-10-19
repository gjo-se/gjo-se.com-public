import type { MarkerVariants } from './Marker.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MarkerProps
  extends MarkerVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
