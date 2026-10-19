import type { ComponentPropsWithoutRef } from 'react';

export interface AlertDialogCancelProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
}
