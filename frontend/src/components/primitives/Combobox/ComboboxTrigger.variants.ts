import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxTriggerVariants = cva('flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs', { variants: {}, defaultVariants: {} });
export type ComboboxTriggerVariants = VariantProps<typeof comboboxTriggerVariants>;
