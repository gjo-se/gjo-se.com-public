import type { CommandListVariants } from './CommandList.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface CommandListProps extends CommandListVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
