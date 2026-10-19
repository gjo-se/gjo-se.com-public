import type { KbdVariants } from './Kbd.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface KbdProps
  extends KbdVariants,
    Omit<ComponentPropsWithoutRef<'kbd'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
