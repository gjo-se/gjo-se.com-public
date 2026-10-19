import { cva, type VariantProps } from 'class-variance-authority';
export const attachmentContentVariants = cva('max-w-full min-w-0 flex-1 leading-tight', { variants: {}, defaultVariants: {} });
export type AttachmentContentVariants = VariantProps<typeof attachmentContentVariants>;
