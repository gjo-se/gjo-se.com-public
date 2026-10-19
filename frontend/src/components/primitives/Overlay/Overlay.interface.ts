import type { OverlayVariants } from './Overlay.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface OverlayProps
  extends OverlayVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
