import type { CollapsibleVariants } from './Collapsible.variants';
import type { ComponentPropsWithoutRef } from 'react';

export interface CollapsibleProps
  extends CollapsibleVariants,
    Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}
