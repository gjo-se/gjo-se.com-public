import type { ItemMediaVariants } from './ItemMedia.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ItemMediaProps
  extends ItemMediaVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
