import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import { dialogCloseVariants } from './DialogClose.variants';

import type { DialogCloseProps } from './DialogClose.interface';

/** DialogClose – Button that closes the dialog. */
export default function DialogClose({ children, ...domProps }: DialogCloseProps) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn(dialogCloseVariants())}
      {...domProps}
    >
      {children}
    </DialogPrimitive.Close>
  );
}
