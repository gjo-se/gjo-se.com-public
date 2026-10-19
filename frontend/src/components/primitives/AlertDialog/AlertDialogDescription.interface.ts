import type { AlertDialogDescriptionVariants } from './AlertDialogDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogDescriptionProps extends AlertDialogDescriptionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
