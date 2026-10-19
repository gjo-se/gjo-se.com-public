import type { EmptyDescriptionVariants } from './EmptyDescription.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface EmptyDescriptionProps
  extends EmptyDescriptionVariants,
    Omit<ComponentPropsWithoutRef<'p'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
