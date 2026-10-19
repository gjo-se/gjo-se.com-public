import type { ComboboxInputVariants } from './ComboboxInput.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxInputProps extends ComboboxInputVariants, Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'style'> { children?: React.ReactNode; }
