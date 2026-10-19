import { cva, type VariantProps } from 'class-variance-authority';
export const attachmentDescriptionVariants = cva('mt-0.5 block min-w-0 truncate text-xs text-muted-foreground max-w-full', { variants: {}, defaultVariants: {} });
export type AttachmentDescriptionVariants = VariantProps<typeof attachmentDescriptionVariants>;
