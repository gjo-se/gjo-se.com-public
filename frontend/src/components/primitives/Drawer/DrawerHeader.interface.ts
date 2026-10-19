import type { DrawerHeaderVariants } from './DrawerHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerHeaderProps
  extends DrawerHeaderVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
