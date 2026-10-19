import type { NativeSelectOptionVariants } from './NativeSelectOption.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface NativeSelectOptionProps extends NativeSelectOptionVariants, Omit<ComponentPropsWithoutRef<'option'>, 'className' | 'style'> { children?: React.ReactNode; }
