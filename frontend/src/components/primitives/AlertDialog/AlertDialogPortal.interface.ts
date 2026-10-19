import type { AlertDialogPortalVariants } from './AlertDialogPortal.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogPortalProps extends AlertDialogPortalVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
