import { OTPInput } from 'input-otp';

import { cn } from '@src/lib/utils';

import { inputOTPVariants } from './InputOTP.variants';

import type { InputOTPProps } from './InputOTP.interface';

/**
 * InputOTP – One-time password input with individual character slots.
 */
export default function InputOTP({
  containerClassName,
  ...domProps
}: InputOTPProps) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        'cn-input-otp flex items-center has-disabled:opacity-50',
        containerClassName,
      )}
      spellCheck={false}
      className={cn(inputOTPVariants())}
      {...domProps}
    />
  );
}
