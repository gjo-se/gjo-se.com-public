import type { ComboboxValueVariants } from './ComboboxValue.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxValueProps extends ComboboxValueVariants, Omit<ComponentPropsWithoutRef<'span'>, 'style'> { children?: React.ReactNode; }
