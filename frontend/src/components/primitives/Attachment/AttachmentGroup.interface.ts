import type { AttachmentGroupVariants } from './AttachmentGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AttachmentGroupProps extends AttachmentGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
