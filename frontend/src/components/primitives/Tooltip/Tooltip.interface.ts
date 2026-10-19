import type { TooltipVariants } from './Tooltip.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TooltipProps
  extends TooltipVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}
