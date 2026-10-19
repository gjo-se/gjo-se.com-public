import { cva, type VariantProps } from 'class-variance-authority';
export const messageScrollerVariants = cva('group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden', { variants: {}, defaultVariants: {} });
export type MessageScrollerVariants = VariantProps<typeof messageScrollerVariants>;
