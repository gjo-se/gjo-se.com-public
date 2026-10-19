import { cva, type VariantProps } from 'class-variance-authority';

export const colorPickerVariants = cva('', {
  variants: {},
  defaultVariants: {},
});

export type ColorPickerVariants = VariantProps<typeof colorPickerVariants>;
