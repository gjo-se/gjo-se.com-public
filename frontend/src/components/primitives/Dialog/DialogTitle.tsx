import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import { dialogTitleVariants } from './DialogTitle.variants';

import type { DialogTitleProps } from './DialogTitle.interface';

/** DialogTitle – Accessible heading for the dialog. */
export default function DialogTitle({ children, ...domProps }: DialogTitleProps) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(dialogTitleVariants())}
      {...domProps}
    >
      {children}
    </DialogPrimitive.Title>
  );
}
