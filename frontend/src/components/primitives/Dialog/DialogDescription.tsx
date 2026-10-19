import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import { dialogDescriptionVariants } from './DialogDescription.variants';

import type { DialogDescriptionProps } from './DialogDescription.interface';

/** DialogDescription – Accessible description text for the dialog. */
export default function DialogDescription({ children, ...domProps }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(dialogDescriptionVariants())}
      {...domProps}
    >
      {children}
    </DialogPrimitive.Description>
  );
}
