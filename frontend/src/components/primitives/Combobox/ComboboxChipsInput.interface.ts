import type { ComboboxChipsInputVariants } from './ComboboxChipsInput.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxChipsInputProps extends ComboboxChipsInputVariants, Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'style'> { children?: React.ReactNode; }
