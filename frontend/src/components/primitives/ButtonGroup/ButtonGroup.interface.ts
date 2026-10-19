import type { ButtonGroupVariants } from './ButtonGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface ButtonGroupProps extends ButtonGroupVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
