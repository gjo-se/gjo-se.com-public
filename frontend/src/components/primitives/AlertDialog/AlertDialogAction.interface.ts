import type { AlertDialogActionVariants } from './AlertDialogAction.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogActionProps extends AlertDialogActionVariants, Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> { children?: React.ReactNode; }
