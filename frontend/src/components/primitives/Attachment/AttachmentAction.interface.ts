import type { AttachmentActionVariants } from './AttachmentAction.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface AttachmentActionProps
  extends AttachmentActionVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  variant?: string;
  size?: string;
}
