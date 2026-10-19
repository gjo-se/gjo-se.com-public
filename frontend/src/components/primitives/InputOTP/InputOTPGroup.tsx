import { cn } from '@src/lib/utils';

import { inputOTPGroupVariants } from './InputOTPGroup.variants';

import type { InputOTPGroupProps } from './InputOTPGroup.interface';

/**
 * InputOTPGroup – Groups OTP input slots.
 */
export default function InputOTPGroup({ children, ...domProps }: InputOTPGroupProps) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(inputOTPGroupVariants())}
      {...domProps}
    >
      {children}
    </div>
  );
}
