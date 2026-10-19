import type { CheckboxVariants } from './Checkbox.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CheckboxProps
  extends CheckboxVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style' | 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  indeterminate?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
}
