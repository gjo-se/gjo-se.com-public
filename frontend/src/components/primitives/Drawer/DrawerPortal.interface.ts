import type { DrawerPortalVariants } from './DrawerPortal.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerPortalProps
  extends DrawerPortalVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
