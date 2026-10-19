import type { ComboboxChipVariants } from './ComboboxChip.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxChipProps extends ComboboxChipVariants, Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'> { children?: React.ReactNode; }
