import type { DrawerDescriptionVariants } from './DrawerDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerDescriptionProps
  extends DrawerDescriptionVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
