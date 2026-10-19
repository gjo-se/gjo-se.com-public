import { cva, type VariantProps } from 'class-variance-authority';
export const emptyHeaderVariants = cva('flex max-w-sm flex-col items-center gap-2', { variants: {}, defaultVariants: {} });
export type EmptyHeaderVariants = VariantProps<typeof emptyHeaderVariants>;
