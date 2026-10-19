import type { PopoverTitleVariants } from './PopoverTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface PopoverTitleProps
  extends PopoverTitleVariants,
    Omit<ComponentPropsWithoutRef<'h2'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
