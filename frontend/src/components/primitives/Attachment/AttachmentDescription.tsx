import { cn } from '@src/lib/utils';

import { attachmentDescriptionVariants } from './AttachmentDescription.variants';

import type { AttachmentDescriptionProps } from './AttachmentDescription.interface';

/**
 *
 */
export default function AttachmentDescription({ children, ...domProps }: AttachmentDescriptionProps) {
  return <span data-slot="attachment-description" className={cn(attachmentDescriptionVariants())} {...domProps}>{children}</span>;
}
