import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@src/lib/utils';

import { alertDialogOverlayVariants } from './AlertDialogOverlay.variants';

import type { AlertDialogOverlayProps } from './AlertDialogOverlay.interface';

/**
 *
 */
export default function AlertDialogOverlay({ ...domProps }: AlertDialogOverlayProps) {
  return <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className={cn(alertDialogOverlayVariants())} {...domProps} />;
}
