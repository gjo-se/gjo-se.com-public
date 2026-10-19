import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxInputVariants = cva('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50', { variants: {}, defaultVariants: {} });
export type ComboboxInputVariants = VariantProps<typeof comboboxInputVariants>;
