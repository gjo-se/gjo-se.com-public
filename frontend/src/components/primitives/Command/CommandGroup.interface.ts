import type { CommandGroupVariants } from './CommandGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface CommandGroupProps extends CommandGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { heading?: string; children?: React.ReactNode; }
