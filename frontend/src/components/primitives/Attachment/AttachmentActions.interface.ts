import type { AttachmentActionsVariants } from './AttachmentActions.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AttachmentActionsProps extends AttachmentActionsVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
