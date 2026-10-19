import type { AlertDialogHeaderVariants } from './AlertDialogHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogHeaderProps extends AlertDialogHeaderVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
