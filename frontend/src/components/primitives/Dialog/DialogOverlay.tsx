import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import { dialogOverlayVariants } from './DialogOverlay.variants';

import type { DialogOverlayProps } from './DialogOverlay.interface';

/** DialogOverlay – Semi-transparent backdrop behind the dialog. */
export default function DialogOverlay({ ...domProps }: DialogOverlayProps) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(dialogOverlayVariants())}
      {...domProps}
    />
  );
}
