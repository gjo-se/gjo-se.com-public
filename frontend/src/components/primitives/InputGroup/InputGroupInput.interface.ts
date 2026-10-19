import type { InputGroupInputVariants } from './InputGroupInput.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputGroupInputProps
  extends InputGroupInputVariants,
    Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
