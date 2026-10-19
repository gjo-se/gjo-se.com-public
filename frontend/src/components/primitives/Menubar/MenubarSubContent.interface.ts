import type { MenubarSubContentVariants } from './MenubarSubContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MenubarSubContentProps
  extends MenubarSubContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
