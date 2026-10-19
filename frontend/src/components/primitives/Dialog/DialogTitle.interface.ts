import type { DialogTitleVariants } from './DialogTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogTitleProps
  extends DialogTitleVariants,
    Omit<ComponentPropsWithoutRef<'h2'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
