import { cn } from '@src/lib/utils';

import { alertDialogFooterVariants } from './AlertDialogFooter.variants';

import type { AlertDialogFooterProps } from './AlertDialogFooter.interface';

/** AlertDialogFooter – Bottom action button area. */
export default function AlertDialogFooter({ children, ...domProps }: AlertDialogFooterProps) {
  return <div data-slot="alert-dialog-footer" className={cn(alertDialogFooterVariants())} {...domProps}>{children}</div>;
}
