import type { DialogPortalVariants } from './DialogPortal.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogPortalProps
  extends DialogPortalVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
