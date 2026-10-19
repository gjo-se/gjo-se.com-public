import type { InputGroupTextVariants } from './InputGroupText.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputGroupTextProps
  extends InputGroupTextVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
