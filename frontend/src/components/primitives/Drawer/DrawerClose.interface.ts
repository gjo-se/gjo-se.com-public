import type { DrawerCloseVariants } from './DrawerClose.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerCloseProps
  extends DrawerCloseVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
