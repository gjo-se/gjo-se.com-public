import type { PopoverTriggerVariants } from './PopoverTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface PopoverTriggerProps
  extends PopoverTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
