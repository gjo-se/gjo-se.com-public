import { cn } from '@src/lib/utils';

import { attachmentActionsVariants } from './AttachmentActions.variants';

import type { AttachmentActionsProps } from './AttachmentActions.interface';

/**
 *
 */
export default function AttachmentActions({ children, ...domProps }: AttachmentActionsProps) {
  return <div data-slot="attachment-actions" className={cn(attachmentActionsVariants())} {...domProps}>{children}</div>;
}
