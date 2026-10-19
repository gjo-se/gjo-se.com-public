import { cn } from '@src/lib/utils';

import { attachmentTitleVariants } from './AttachmentTitle.variants';

import type { AttachmentTitleProps } from './AttachmentTitle.interface';

/**
 *
 */
export default function AttachmentTitle({ children, ...domProps }: AttachmentTitleProps) {
  return <span data-slot="attachment-title" className={cn(attachmentTitleVariants())} {...domProps}>{children}</span>;
}
