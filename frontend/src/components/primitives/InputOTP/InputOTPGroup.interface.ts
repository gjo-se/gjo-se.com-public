import type { InputOTPGroupVariants } from './InputOTPGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputOTPGroupProps
  extends InputOTPGroupVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
