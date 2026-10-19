import type { ComboboxSeparatorVariants } from './ComboboxSeparator.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxSeparatorProps extends ComboboxSeparatorVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
