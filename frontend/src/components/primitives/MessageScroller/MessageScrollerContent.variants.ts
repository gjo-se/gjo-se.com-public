import { cva, type VariantProps } from 'class-variance-authority';
export const messageScrollerContentVariants = cva('flex h-max min-h-full flex-col gap-8', { variants: {}, defaultVariants: {} });
export type MessageScrollerContentVariants = VariantProps<typeof messageScrollerContentVariants>;
