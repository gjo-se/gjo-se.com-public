import type { ComboboxEmptyVariants } from './ComboboxEmpty.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxEmptyProps extends ComboboxEmptyVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
