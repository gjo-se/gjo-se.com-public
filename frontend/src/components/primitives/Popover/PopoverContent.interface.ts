import type { PopoverContentVariants } from './PopoverContent.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface PopoverContentProps
  extends PopoverContentVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  side?: 'bottom' | 'inline-end' | 'inline-start' | 'left' | 'right' | 'top';
  sideOffset?: number;
  children?: React.ReactNode;
}
