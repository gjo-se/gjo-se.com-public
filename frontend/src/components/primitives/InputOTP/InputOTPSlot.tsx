import { OTPInputContext } from 'input-otp';
import React from 'react';

import { cn } from '@src/lib/utils';

import { inputOTPSlotVariants } from './InputOTPSlot.variants';

import type { InputOTPSlotProps } from './InputOTPSlot.interface';

/**
 * InputOTPSlot – Single character slot in an OTP input.
 */
export default function InputOTPSlot({
  index,
  children,
  ...domProps
}: InputOTPSlotProps) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(inputOTPSlotVariants())}
      {...domProps}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      )}
      {children}
    </div>
  );
}
