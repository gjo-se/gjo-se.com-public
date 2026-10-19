import { cva, type VariantProps } from 'class-variance-authority';
export const itemFooterVariants = cva('flex basis-full items-center justify-between gap-2', { variants: {}, defaultVariants: {} });
export type ItemFooterVariants = VariantProps<typeof itemFooterVariants>;
