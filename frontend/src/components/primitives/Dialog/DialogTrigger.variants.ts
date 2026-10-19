import { cva, type VariantProps } from 'class-variance-authority';

export const dialogTriggerVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type DialogTriggerVariants = VariantProps<typeof dialogTriggerVariants>;
