import type { CollapsibleTriggerVariants } from './CollapsibleTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CollapsibleTriggerProps
  extends CollapsibleTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
