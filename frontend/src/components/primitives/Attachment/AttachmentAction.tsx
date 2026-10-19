import { Button as ShadcnButton } from '@src/components/vendor/shadcn/button';
import { cn } from '@src/lib/utils';

import { attachmentActionVariants } from './AttachmentAction.variants';

import type { AttachmentActionProps } from './AttachmentAction.interface';

/**
 *
 */
export default function AttachmentAction({ variant = 'ghost', size = 'icon-xs', children, ...domProps }: AttachmentActionProps) {
  return <ShadcnButton data-slot="attachment-action" variant={variant as 'ghost'} size={size as 'icon-xs'} className={cn(attachmentActionVariants())} {...domProps}>{children}</ShadcnButton>;
}
