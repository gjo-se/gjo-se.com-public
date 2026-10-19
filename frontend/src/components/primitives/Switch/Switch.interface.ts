import type { SwitchVariants } from './Switch.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface SwitchProps
  extends SwitchVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style' | 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}
