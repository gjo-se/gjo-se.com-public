import type { DialogVariants } from './Dialog.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface DialogProps
  extends DialogVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
  children?: React.ReactNode;
}
