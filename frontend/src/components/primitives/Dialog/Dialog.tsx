import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import type { DialogProps } from './Dialog.interface';

/**
 * Dialog – Modal overlay with backdrop, title, description, and action buttons.
 */
export default function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  modal,
  children,
  ...domProps
}: DialogProps) {
  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      modal={modal}
      {...domProps}
    >
      {children}
    </DialogPrimitive.Root>
  );
}
