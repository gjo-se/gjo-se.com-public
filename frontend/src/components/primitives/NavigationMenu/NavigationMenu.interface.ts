import type { NavigationMenuVariants } from './NavigationMenu.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface NavigationMenuProps
  extends NavigationMenuVariants,
    Omit<ComponentPropsWithoutRef<'nav'>, 'className' | 'style'> {
  children?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}
