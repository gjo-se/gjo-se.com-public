import type { AttachmentDescriptionVariants } from './AttachmentDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AttachmentDescriptionProps extends AttachmentDescriptionVariants, Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> { children?: React.ReactNode; }
