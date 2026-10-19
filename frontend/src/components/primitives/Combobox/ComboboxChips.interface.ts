import type { ComboboxChipsVariants } from './ComboboxChips.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxChipsProps extends ComboboxChipsVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
