import { cva, type VariantProps } from 'class-variance-authority';
export const commandSeparatorVariants = cva('-mx-1 h-px bg-border', { variants: {}, defaultVariants: {} });
export type CommandSeparatorVariants = VariantProps<typeof commandSeparatorVariants>;
