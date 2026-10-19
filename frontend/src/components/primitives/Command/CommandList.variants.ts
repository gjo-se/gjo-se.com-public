import { cva, type VariantProps } from 'class-variance-authority';
export const commandListVariants = cva('max-h-command overflow-y-auto overflow-x-hidden', { variants: {}, defaultVariants: {} });
export type CommandListVariants = VariantProps<typeof commandListVariants>;
