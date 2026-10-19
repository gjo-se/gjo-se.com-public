import { cva, type VariantProps } from 'class-variance-authority';
export const itemActionsVariants = cva('flex items-center gap-2', { variants: {}, defaultVariants: {} });
export type ItemActionsVariants = VariantProps<typeof itemActionsVariants>;
