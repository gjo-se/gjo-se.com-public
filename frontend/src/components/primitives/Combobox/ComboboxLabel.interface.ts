import type { ComboboxLabelVariants } from './ComboboxLabel.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxLabelProps extends ComboboxLabelVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
