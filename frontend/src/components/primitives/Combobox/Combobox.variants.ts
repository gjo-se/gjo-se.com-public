import { cva, type VariantProps } from 'class-variance-authority';

export const comboboxVariants = cva('relative', {
  variants: {},
  defaultVariants: {},
});

export type ComboboxVariants = VariantProps<typeof comboboxVariants>;
