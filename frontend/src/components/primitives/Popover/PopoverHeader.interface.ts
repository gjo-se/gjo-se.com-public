import type { PopoverHeaderVariants } from './PopoverHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface PopoverHeaderProps
  extends PopoverHeaderVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
