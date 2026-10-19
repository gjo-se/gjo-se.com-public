import { cva, type VariantProps } from 'class-variance-authority';

export const popoverHeaderVariants = cva('flex flex-col gap-1 text-sm', {
  variants: {},
  defaultVariants: {},
});

export type PopoverHeaderVariants = VariantProps<typeof popoverHeaderVariants>;
