import type { EmptyHeaderVariants } from './EmptyHeader.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface EmptyHeaderProps extends EmptyHeaderVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
