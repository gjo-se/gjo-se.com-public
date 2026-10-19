import type { ComboboxGroupVariants } from './ComboboxGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxGroupProps extends ComboboxGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
