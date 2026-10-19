import type { MenubarCheckboxItemVariants } from './MenubarCheckboxItem.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface MenubarCheckboxItemProps
  extends MenubarCheckboxItemVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  checked?: boolean;
  inset?: boolean;
}
