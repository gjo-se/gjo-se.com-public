import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { inputOTPSeparatorVariants } from './InputOTPSeparator.variants';

import type { InputOTPSeparatorProps } from './InputOTPSeparator.interface';

/**
 * InputOTPSeparator – Visual separator between OTP slot groups.
 */
export default function InputOTPSeparator({ ...domProps }: InputOTPSeparatorProps) {
  return (
    <div
      data-slot="input-otp-separator"
      className={cn(inputOTPSeparatorVariants())}
      role="separator"
      {...domProps}
    >
      <Icon name="minus" />
    </div>
  );
}
