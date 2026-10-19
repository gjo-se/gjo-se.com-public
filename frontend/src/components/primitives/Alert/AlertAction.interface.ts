import type { AlertActionVariants } from './AlertAction.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertActionProps extends AlertActionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
