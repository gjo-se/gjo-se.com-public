import { cva, type VariantProps } from 'class-variance-authority';

export const inputOTPGroupVariants = cva(
  'flex items-center rounded-md has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type InputOTPGroupVariants = VariantProps<typeof inputOTPGroupVariants>;
