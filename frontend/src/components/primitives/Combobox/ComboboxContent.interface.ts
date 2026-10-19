import type { ComboboxContentVariants } from './ComboboxContent.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ComboboxContentProps extends ComboboxContentVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { children?: React.ReactNode; }
