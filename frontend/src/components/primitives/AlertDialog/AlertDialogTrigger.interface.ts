import type { AlertDialogTriggerVariants } from './AlertDialogTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDialogTriggerProps extends AlertDialogTriggerVariants, Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> { children?: React.ReactNode; }
