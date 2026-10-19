import type { CommandEmptyVariants } from './CommandEmpty.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface CommandEmptyProps extends CommandEmptyVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
