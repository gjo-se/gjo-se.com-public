import { cva, type VariantProps } from 'class-variance-authority';
export const itemSeparatorVariants = cva('my-2', { variants: {}, defaultVariants: {} });
export type ItemSeparatorVariants = VariantProps<typeof itemSeparatorVariants>;
