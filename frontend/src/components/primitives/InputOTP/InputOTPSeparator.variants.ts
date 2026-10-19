import { cva, type VariantProps } from 'class-variance-authority';

export const inputOTPSeparatorVariants = cva(
  'flex items-center [&_svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type InputOTPSeparatorVariants = VariantProps<typeof inputOTPSeparatorVariants>;
