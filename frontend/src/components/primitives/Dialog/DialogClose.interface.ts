import type { DialogCloseVariants } from './DialogClose.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogCloseProps
  extends DialogCloseVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
