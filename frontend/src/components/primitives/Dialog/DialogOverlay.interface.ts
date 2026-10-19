import type { DialogOverlayVariants } from './DialogOverlay.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogOverlayProps
  extends DialogOverlayVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
