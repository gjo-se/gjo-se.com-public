import type { AttachmentTitleVariants } from './AttachmentTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AttachmentTitleProps extends AttachmentTitleVariants, Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> { children?: React.ReactNode; }
