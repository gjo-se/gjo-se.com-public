import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxListVariants = cva('max-h-64 overflow-y-auto divide-y divide-primary-subtle-border', { variants: {}, defaultVariants: {} });
export type ComboboxListVariants = VariantProps<typeof comboboxListVariants>;
