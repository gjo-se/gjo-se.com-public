import { cva, type VariantProps } from 'class-variance-authority';

export const inputOTPSlotVariants = cva(
  'relative flex size-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40',
  {
    variants: {},
    defaultVariants: {},
  },
);

export type InputOTPSlotVariants = VariantProps<typeof inputOTPSlotVariants>;
