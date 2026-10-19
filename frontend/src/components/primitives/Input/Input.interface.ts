import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface InputProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'style'> {
  error?: boolean;
  helperText?: string;
  leftIcon?: ReactNode;
  label?: string;
  children?: React.ReactNode;
}
