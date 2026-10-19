import type { DialogFooterVariants } from './DialogFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogFooterProps
  extends DialogFooterVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
