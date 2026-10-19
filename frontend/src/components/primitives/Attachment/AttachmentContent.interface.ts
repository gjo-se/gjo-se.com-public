import type { AttachmentContentVariants } from './AttachmentContent.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AttachmentContentProps extends AttachmentContentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
