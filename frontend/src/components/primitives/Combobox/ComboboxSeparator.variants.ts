import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxSeparatorVariants = cva('-mx-1 my-1 h-px bg-border', { variants: {}, defaultVariants: {} });
export type ComboboxSeparatorVariants = VariantProps<typeof comboboxSeparatorVariants>;
