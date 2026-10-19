import type { ButtonGroupSeparatorVariants } from './ButtonGroupSeparator.variants';
import type { ComponentPropsWithoutRef } from 'react';
export interface ButtonGroupSeparatorProps extends ButtonGroupSeparatorVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> { orientation?: 'horizontal' | 'vertical'; }
