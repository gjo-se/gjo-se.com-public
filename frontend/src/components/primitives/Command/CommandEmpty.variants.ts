import { cva, type VariantProps } from 'class-variance-authority';
export const commandEmptyVariants = cva('py-6 text-center text-sm text-muted-foreground', { variants: {}, defaultVariants: {} });
export type CommandEmptyVariants = VariantProps<typeof commandEmptyVariants>;
