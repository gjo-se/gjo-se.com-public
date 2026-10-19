import type { KbdGroupVariants } from './KbdGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface KbdGroupProps
  extends KbdGroupVariants,
    Omit<ComponentPropsWithoutRef<'kbd'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
