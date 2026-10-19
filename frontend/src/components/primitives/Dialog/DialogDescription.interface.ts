import type { DialogDescriptionVariants } from './DialogDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogDescriptionProps
  extends DialogDescriptionVariants,
    Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
