import type { TooltipProviderVariants } from './TooltipProvider.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TooltipProviderProps
  extends TooltipProviderVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  delay?: number;
  children?: React.ReactNode;
}
