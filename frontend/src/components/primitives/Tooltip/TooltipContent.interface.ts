import type { TooltipContentVariants } from './TooltipContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface TooltipContentProps
  extends TooltipContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  side?: 'bottom' | 'inline-end' | 'inline-start' | 'left' | 'right' | 'top';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  children?: React.ReactNode;
}
