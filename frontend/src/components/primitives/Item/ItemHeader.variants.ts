import { cva, type VariantProps } from 'class-variance-authority';
export const itemHeaderVariants = cva('flex basis-full items-center justify-between gap-2', { variants: {}, defaultVariants: {} });
export type ItemHeaderVariants = VariantProps<typeof itemHeaderVariants>;
