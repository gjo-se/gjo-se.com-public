import { cva, type VariantProps } from 'class-variance-authority';
export const attachmentActionsVariants = cva('relative z-20 flex shrink-0 items-center', { variants: {}, defaultVariants: {} });
export type AttachmentActionsVariants = VariantProps<typeof attachmentActionsVariants>;
