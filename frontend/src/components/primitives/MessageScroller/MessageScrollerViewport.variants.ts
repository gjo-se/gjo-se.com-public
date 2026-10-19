import { cva, type VariantProps } from 'class-variance-authority';
export const messageScrollerViewportVariants = cva('size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content data-autoscrolling:scrollbar-none', { variants: {}, defaultVariants: {} });
export type MessageScrollerViewportVariants = VariantProps<typeof messageScrollerViewportVariants>;
