import type { PopoverVariants } from './Popover.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface PopoverProps
  extends PopoverVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}
