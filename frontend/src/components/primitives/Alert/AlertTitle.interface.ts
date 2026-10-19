import type { AlertTitleVariants } from './AlertTitle.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertTitleProps extends AlertTitleVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
