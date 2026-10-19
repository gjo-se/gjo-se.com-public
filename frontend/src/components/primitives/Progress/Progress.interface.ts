import type { ProgressVariants } from './Progress.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ProgressProps
  extends ProgressVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  value: number;
  max?: number;
  label?: string;
  children?: React.ReactNode;
}
