import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxChipsInputVariants = cva('min-w-20 flex-1 border-0 bg-transparent p-0 text-sm outline-none focus:ring-0', { variants: {}, defaultVariants: {} });
export type ComboboxChipsInputVariants = VariantProps<typeof comboboxChipsInputVariants>;
