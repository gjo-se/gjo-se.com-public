import { cn } from '@src/lib/utils';

import { attachmentContentVariants } from './AttachmentContent.variants';

import type { AttachmentContentProps } from './AttachmentContent.interface';

/**
 *
 */
export default function AttachmentContent({ children, ...domProps }: AttachmentContentProps) {
  return <div data-slot="attachment-content" className={cn(attachmentContentVariants())} {...domProps}>{children}</div>;
}
