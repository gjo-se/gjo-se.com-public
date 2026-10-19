import { cva, type VariantProps } from 'class-variance-authority';

export const inputOTPVariants = cva('disabled:cursor-not-allowed', {
  variants: {},
  defaultVariants: {},
});

export type InputOTPVariants = VariantProps<typeof inputOTPVariants>;
