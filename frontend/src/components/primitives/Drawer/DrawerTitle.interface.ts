import type { DrawerTitleVariants } from './DrawerTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerTitleProps
  extends DrawerTitleVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
