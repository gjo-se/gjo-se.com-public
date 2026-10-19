import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxChipsVariants = cva('flex flex-wrap gap-1.5 p-1.5', { variants: {}, defaultVariants: {} });
export type ComboboxChipsVariants = VariantProps<typeof comboboxChipsVariants>;
