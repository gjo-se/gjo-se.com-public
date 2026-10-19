import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@src/lib/utils';

import { alertDialogContentVariants } from './AlertDialogContent.variants';
import AlertDialogOverlay from './AlertDialogOverlay';
import AlertDialogPortal from './AlertDialogPortal';

import type { AlertDialogContentProps } from './AlertDialogContent.interface';

/** AlertDialogContent – Centered modal content with overlay. */
export default function AlertDialogContent({ size = 'default', children, ...domProps }: AlertDialogContentProps) {
  return <AlertDialogPortal><AlertDialogOverlay /><AlertDialogPrimitive.Popup data-slot="alert-dialog-content" data-size={size} className={cn(alertDialogContentVariants())} {...domProps}>{children}</AlertDialogPrimitive.Popup></AlertDialogPortal>;
}
