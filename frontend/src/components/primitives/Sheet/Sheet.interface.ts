import type { ComponentPropsWithoutRef } from 'react';

export interface SheetProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
