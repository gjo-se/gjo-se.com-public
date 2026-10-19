import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '@src/lib/utils';

import { alertDialogTitleVariants } from './AlertDialogTitle.variants';

import type { AlertDialogTitleProps } from './AlertDialogTitle.interface';

/**
 *
 */
export default function AlertDialogTitle({ children, ...domProps }: AlertDialogTitleProps) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(alertDialogTitleVariants())} {...domProps}>{children}</AlertDialogPrimitive.Title>;
}
