import { cn } from '@src/lib/utils';

import { dialogFooterVariants } from './DialogFooter.variants';

import type { DialogFooterProps } from './DialogFooter.interface';

/** DialogFooter – Footer section of a dialog, typically containing action buttons. */
export default function DialogFooter({ children, ...domProps }: DialogFooterProps) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(dialogFooterVariants())}
      {...domProps}
    >
      {children}
    </div>
  );
}
