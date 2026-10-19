import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@src/lib/utils';

import { alertDialogDescriptionVariants } from './AlertDialogDescription.variants';

import type { AlertDialogDescriptionProps } from './AlertDialogDescription.interface';

/** AlertDialogDescription – Descriptive text inside an AlertDialog. */
export default function AlertDialogDescription({ children, ...domProps }: AlertDialogDescriptionProps) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(alertDialogDescriptionVariants())} {...domProps}>{children}</AlertDialogPrimitive.Description>;
}
