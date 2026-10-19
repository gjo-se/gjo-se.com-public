import type { DialogHeaderVariants } from './DialogHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogHeaderProps
  extends DialogHeaderVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
