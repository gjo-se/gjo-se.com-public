import type { TextareaVariants } from './Textarea.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TextareaProps
  extends TextareaVariants,
    Omit<ComponentPropsWithoutRef<'textarea'>, 'className' | 'style'> {
  label?: string;
  children?: React.ReactNode;
}
