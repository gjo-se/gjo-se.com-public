import type { MenubarVariants } from './Menubar.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MenubarProps
  extends MenubarVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
