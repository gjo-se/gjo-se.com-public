import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';

import Icon from '@src/components/primitives/Icon/Icon';
import { cn } from '@src/lib/utils';

import { dialogContentVariants } from './DialogContent.variants';
import DialogOverlay from './DialogOverlay';
import DialogPortal from './DialogPortal';

import type { DialogContentProps } from './DialogContent.interface';

/** DialogContent – Modal dialog (side=dialog) or slide-in panel (side=left/right/top/bottom). */
export default function DialogContent({
  side = 'dialog',
  size = 'md',
  showCloseButton = true,
  children,
  ...domProps
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-side={side}
        className={cn(dialogContentVariants({ side, size }))}
        {...domProps}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Icon name="x" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}
