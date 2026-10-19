import { cn } from '@src/lib/utils';

import { alertDialogHeaderVariants } from './AlertDialogHeader.variants';

import type { AlertDialogHeaderProps } from './AlertDialogHeader.interface';

/** AlertDialogHeader – Title and description container. */
export default function AlertDialogHeader({ children, ...domProps }: AlertDialogHeaderProps) {
  return <div data-slot="alert-dialog-header" className={cn(alertDialogHeaderVariants())} {...domProps}>{children}</div>;
}
