import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import { dialogPortalVariants } from './DialogPortal.variants';

import type { DialogPortalProps } from './DialogPortal.interface';

/** DialogPortal – Portals the dialog content to the document body. */
export default function DialogPortal({ children, ...domProps }: DialogPortalProps) {
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      className={cn(dialogPortalVariants())}
      {...domProps}
    >
      {children}
    </DialogPrimitive.Portal>
  );
}
