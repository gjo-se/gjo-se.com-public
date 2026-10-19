import type { AlertDialogMediaVariants } from './AlertDialogMedia.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogMediaProps extends AlertDialogMediaVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
