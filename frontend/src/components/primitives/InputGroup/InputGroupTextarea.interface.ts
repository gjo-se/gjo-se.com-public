import type { InputGroupTextareaVariants } from './InputGroupTextarea.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputGroupTextareaProps
  extends InputGroupTextareaVariants,
    Omit<ComponentPropsWithoutRef<'textarea'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
