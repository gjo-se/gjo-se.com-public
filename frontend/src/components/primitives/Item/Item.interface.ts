import type { ItemVariants } from './Item.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ItemProps
  extends ItemVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
