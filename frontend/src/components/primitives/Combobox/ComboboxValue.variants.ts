import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxValueVariants = cva('flex items-center gap-1 truncate', { variants: {}, defaultVariants: {} });
export type ComboboxValueVariants = VariantProps<typeof comboboxValueVariants>;
