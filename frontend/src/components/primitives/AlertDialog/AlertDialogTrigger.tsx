import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import type { AlertDialogTriggerProps } from './AlertDialogTrigger.interface';

/**
 *
 */
export default function AlertDialogTrigger({ children, ...domProps }: AlertDialogTriggerProps) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...domProps}>{children}</AlertDialogPrimitive.Trigger>;
}
