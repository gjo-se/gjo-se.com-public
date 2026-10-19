import { cva, type VariantProps } from 'class-variance-authority';
export const comboboxItemVariants = cva('relative flex cursor-default items-center gap-2 px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-blue-100 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0', { variants: {}, defaultVariants: {} });
export type ComboboxItemVariants = VariantProps<typeof comboboxItemVariants>;
