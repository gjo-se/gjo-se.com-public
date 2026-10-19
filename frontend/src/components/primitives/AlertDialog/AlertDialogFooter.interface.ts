import type { AlertDialogFooterVariants } from './AlertDialogFooter.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogFooterProps extends AlertDialogFooterVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
