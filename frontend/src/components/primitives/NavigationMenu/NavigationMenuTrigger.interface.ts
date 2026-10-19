import type { NavigationMenuTriggerVariants } from './NavigationMenuTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface NavigationMenuTriggerProps
  extends NavigationMenuTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
