import type { InputGroupVariants } from './InputGroup.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface InputGroupProps
  extends InputGroupVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
