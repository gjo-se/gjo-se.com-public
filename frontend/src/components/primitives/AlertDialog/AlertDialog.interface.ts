import type { AlertDialogVariants } from './AlertDialog.variants';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface AlertDialogProps extends AlertDialogVariants, Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
  children?: ReactNode;
}
