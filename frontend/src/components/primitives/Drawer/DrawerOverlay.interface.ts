import type { DrawerOverlayVariants } from './DrawerOverlay.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerOverlayProps
  extends DrawerOverlayVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
