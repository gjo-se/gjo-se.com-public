import type { ButtonVariants } from './Button.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ButtonProps
  extends ButtonVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  loading?: boolean;
  fullWidth?: boolean;
  submit?: boolean;
}
