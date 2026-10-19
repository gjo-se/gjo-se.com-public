import type { AlertDialogOverlayVariants } from './AlertDialogOverlay.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogOverlayProps extends AlertDialogOverlayVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
