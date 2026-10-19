import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { Button } from '@src/components/vendor/shadcn/button';
import { cn } from '@src/lib/utils';

import type { AlertDialogCancelProps } from './AlertDialogCancel.interface';

/** AlertDialogCancel – Dismiss button inside an AlertDialog. */
export default function AlertDialogCancel({ variant = 'outline', size = 'default', ...domProps }: AlertDialogCancelProps) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={cn()} render={<Button variant={variant} size={size} />} {...domProps} />;
}
