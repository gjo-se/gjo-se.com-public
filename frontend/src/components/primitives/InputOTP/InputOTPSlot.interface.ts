import type { InputOTPSlotVariants } from './InputOTPSlot.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputOTPSlotProps
  extends InputOTPSlotVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  index: number;
  children?: React.ReactNode;
}
