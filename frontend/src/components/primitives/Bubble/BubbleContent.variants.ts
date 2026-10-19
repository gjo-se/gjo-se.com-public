import { cva, type VariantProps } from 'class-variance-authority';
export const bubbleContentVariants = cva('w-fit max-w-full min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors', { variants: {}, defaultVariants: {} });
export type BubbleContentVariants = VariantProps<typeof bubbleContentVariants>;
