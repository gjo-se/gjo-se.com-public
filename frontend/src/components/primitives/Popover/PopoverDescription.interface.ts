import type { PopoverDescriptionVariants } from './PopoverDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface PopoverDescriptionProps
  extends PopoverDescriptionVariants,
    Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
