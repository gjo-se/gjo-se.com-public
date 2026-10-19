import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import type { AlertDialogPortalProps } from './AlertDialogPortal.interface';

/**
 *
 */
export default function AlertDialogPortal({ children, ...domProps }: AlertDialogPortalProps) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...domProps}>{children}</AlertDialogPrimitive.Portal>;
}
