import type { AlertDialogTitleVariants } from './AlertDialogTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogTitleProps extends AlertDialogTitleVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
