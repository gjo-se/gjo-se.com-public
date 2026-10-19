import type { DrawerContentVariants } from './DrawerContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerContentProps
  extends DrawerContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
