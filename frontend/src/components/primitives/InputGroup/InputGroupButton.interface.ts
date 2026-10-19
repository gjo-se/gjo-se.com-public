import type { InputGroupButtonVariants } from './InputGroupButton.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputGroupButtonProps
  extends InputGroupButtonVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  type?: 'button' | 'submit' | 'reset';
}
