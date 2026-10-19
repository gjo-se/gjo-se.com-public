import { cn } from '@src/lib/utils';

import { attachmentGroupVariants } from './AttachmentGroup.variants';

import type { AttachmentGroupProps } from './AttachmentGroup.interface';

/**
 *
 */
export default function AttachmentGroup({ children, ...domProps }: AttachmentGroupProps) {
  return <div data-slot="attachment-group" className={cn(attachmentGroupVariants())} {...domProps}>{children}</div>;
}
