import { cva, type VariantProps } from 'class-variance-authority';
export const commandItemVariants = cva('relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0', { variants: {}, defaultVariants: {} });
export type CommandItemVariants = VariantProps<typeof commandItemVariants>;
