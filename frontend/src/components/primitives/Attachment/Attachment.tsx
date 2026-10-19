import { cn } from '@src/lib/utils';

import { attachmentVariants } from './Attachment.variants';

import type { AttachmentProps } from './Attachment.interface';

/**
 * Attachment – File attachment card with state support.
 */
export default function Attachment({
  state = 'done',
  size = 'default',
  orientation = 'horizontal',
  ...domProps
}: AttachmentProps) {
  return (
    <div
      data-slot="attachment"
      data-state={state}
      className={cn(attachmentVariants({ size, orientation }))}
      {...domProps}
    />
  );
}
