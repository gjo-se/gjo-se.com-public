import type { AlertDescriptionVariants } from './AlertDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface AlertDescriptionProps extends AlertDescriptionVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
