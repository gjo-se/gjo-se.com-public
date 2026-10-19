import type { CollapsibleContentVariants } from './CollapsibleContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CollapsibleContentProps
  extends CollapsibleContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
