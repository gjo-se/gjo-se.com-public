import type { SeparatorVariants } from './Separator.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface SeparatorProps
  extends SeparatorVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
