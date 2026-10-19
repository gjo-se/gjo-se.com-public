import type { DrawerTriggerVariants } from './DrawerTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DrawerTriggerProps
  extends DrawerTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
