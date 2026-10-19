import type { InputOTPSeparatorVariants } from './InputOTPSeparator.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputOTPSeparatorProps
  extends InputOTPSeparatorVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
