import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxLabelVariants = cva('px-2 py-1.5 text-sm font-medium text-muted-foreground', { variants: {}, defaultVariants: {} });
export type ComboboxLabelVariants = VariantProps<typeof comboboxLabelVariants>;
