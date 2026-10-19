import type { RadioGroupItemVariants } from './RadioGroupItem.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface RadioGroupItemProps
  extends RadioGroupItemVariants,
    Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> {
  value: string;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}
