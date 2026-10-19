import type { InputGroupAddonVariants } from './InputGroupAddon.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputGroupAddonProps
  extends InputGroupAddonVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
