import type { CommandSeparatorVariants } from './CommandSeparator.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface CommandSeparatorProps extends CommandSeparatorVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
