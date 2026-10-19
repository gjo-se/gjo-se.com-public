import { cva, type VariantProps } from 'class-variance-authority';
export const messageScrollerItemVariants = cva('min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]', { variants: {}, defaultVariants: {} });
export type MessageScrollerItemVariants = VariantProps<typeof messageScrollerItemVariants>;
