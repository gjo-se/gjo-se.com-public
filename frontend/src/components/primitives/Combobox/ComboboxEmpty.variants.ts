import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxEmptyVariants = cva('px-2 py-4 text-center text-sm text-muted-foreground', { variants: {}, defaultVariants: {} });
export type ComboboxEmptyVariants = VariantProps<typeof comboboxEmptyVariants>;
