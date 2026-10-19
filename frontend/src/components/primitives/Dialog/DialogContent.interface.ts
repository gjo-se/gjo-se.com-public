import type { DialogContentVariants } from './DialogContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogContentProps
  extends DialogContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  showCloseButton?: boolean;
  children?: React.ReactNode;
}
