import { cn } from '@src/lib/utils';

import { attachmentMediaVariants } from './AttachmentMedia.variants';

import type { AttachmentMediaProps } from './AttachmentMedia.interface';

/**
 *
 */
export default function AttachmentMedia({ variant = 'icon', children, ...domProps }: AttachmentMediaProps) {
  return <div data-slot="attachment-media" data-variant={variant} className={cn(attachmentMediaVariants({ variant }))} {...domProps}>{children}</div>;
}
