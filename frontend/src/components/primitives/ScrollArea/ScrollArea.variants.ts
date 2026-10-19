import { cva, type VariantProps } from 'class-variance-authority';
export const scrollAreaVariants = cva('relative', { variants: {}, defaultVariants: {} });
export type ScrollAreaVariants = VariantProps<typeof scrollAreaVariants>;
