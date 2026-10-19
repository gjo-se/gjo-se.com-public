import { cn } from '@src/lib/utils';

import { dialogHeaderVariants } from './DialogHeader.variants';

import type { DialogHeaderProps } from './DialogHeader.interface';

/** DialogHeader – Header section of a dialog, typically containing DialogTitle and DialogDescription. */
export default function DialogHeader({ children, ...domProps }: DialogHeaderProps) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(dialogHeaderVariants())}
      {...domProps}
    >
      {children}
    </div>
  );
}
