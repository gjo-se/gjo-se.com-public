import type { AttachmentMediaVariants } from './AttachmentMedia.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AttachmentMediaProps extends AttachmentMediaVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
