import type { AttachmentVariants } from './Attachment.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AttachmentProps extends AttachmentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  state?: 'idle' | 'uploading' | 'processing' | 'error' | 'done';
  children?: React.ReactNode;
}
