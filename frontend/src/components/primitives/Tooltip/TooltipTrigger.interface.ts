import type { TooltipTriggerVariants } from './TooltipTrigger.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TooltipTriggerProps
  extends TooltipTriggerVariants,
    Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  children?: React.ReactNode;
}
