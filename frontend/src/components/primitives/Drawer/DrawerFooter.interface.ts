import type { DrawerFooterVariants } from './DrawerFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerFooterProps
  extends DrawerFooterVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
