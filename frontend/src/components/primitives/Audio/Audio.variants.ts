import { cva, type VariantProps } from 'class-variance-authority';

export const audioVariants = cva('w-full', {
  variants: {},
  defaultVariants: {},
});

export type AudioVariants = VariantProps<typeof audioVariants>;
