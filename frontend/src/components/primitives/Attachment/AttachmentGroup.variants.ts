import { cva, type VariantProps } from 'class-variance-authority';
export const attachmentGroupVariants = cva('flex min-w-0 scroll-fade-x snap-x snap-mandatory scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start', { variants: {}, defaultVariants: {} });
export type AttachmentGroupVariants = VariantProps<typeof attachmentGroupVariants>;
