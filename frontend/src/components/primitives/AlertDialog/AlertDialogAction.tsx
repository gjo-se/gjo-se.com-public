import { Button as ShadcnButton } from '@src/components/vendor/shadcn/button';
import { cn } from '@src/lib/utils';

import { alertDialogActionVariants } from './AlertDialogAction.variants';

import type { AlertDialogActionProps } from './AlertDialogAction.interface';

/** AlertDialogAction – Confirmation button inside an AlertDialog. */
export default function AlertDialogAction({ children, ...domProps }: AlertDialogActionProps) {
  return <ShadcnButton data-slot="alert-dialog-action" className={cn(alertDialogActionVariants())} {...domProps}>{children}</ShadcnButton>;
}
