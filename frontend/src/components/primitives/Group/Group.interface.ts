import type { GroupVariants } from './Group.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface GroupProps
  extends GroupVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
