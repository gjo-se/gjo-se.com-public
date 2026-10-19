import { cva, type VariantProps } from 'class-variance-authority';
export const commandInputVariants = cva('flex-1 border-0 bg-transparent p-0 text-sm outline-hidden focus:ring-0', { variants: {}, defaultVariants: {} });
export type CommandInputVariants = VariantProps<typeof commandInputVariants>;
