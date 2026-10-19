import { cva, type VariantProps } from 'class-variance-authority';
export const attachmentTitleVariants = cva('block max-w-full min-w-0 truncate font-medium', { variants: {}, defaultVariants: {} });
export type AttachmentTitleVariants = VariantProps<typeof attachmentTitleVariants>;
