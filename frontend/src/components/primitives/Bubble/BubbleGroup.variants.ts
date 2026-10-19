import { cva, type VariantProps } from 'class-variance-authority';
export const bubbleGroupVariants = cva('flex min-w-0 flex-col gap-2', { variants: {}, defaultVariants: {} });
export type BubbleGroupVariants = VariantProps<typeof bubbleGroupVariants>;
