import type { RadioGroupVariants } from './RadioGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface RadioGroupProps
  extends RadioGroupVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}
