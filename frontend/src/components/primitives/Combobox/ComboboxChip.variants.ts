import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxChipVariants = cva('inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 text-sm', { variants: {}, defaultVariants: {} });
export type ComboboxChipVariants = VariantProps<typeof comboboxChipVariants>;
