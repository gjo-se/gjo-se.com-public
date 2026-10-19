import { cn } from '@src/lib/utils';

import { alertDialogMediaVariants } from './AlertDialogMedia.variants';

import type { AlertDialogMediaProps } from './AlertDialogMedia.interface';

/** AlertDialogMedia – Icon or illustration area inside the dialog header. */
export default function AlertDialogMedia({ children, ...domProps }: AlertDialogMediaProps) {
  return <div data-slot="alert-dialog-media" className={cn(alertDialogMediaVariants())} {...domProps}>{children}</div>;
}
