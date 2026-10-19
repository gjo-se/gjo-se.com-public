import { Dialog } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import type { SheetTitleProps } from './SheetTitle.interface';

/**
 * SheetTitle – Accessible heading rendered at the top of the Sheet.
 */
export default function SheetTitle({ children, ...domProps }: SheetTitleProps) {
  return (
    <Dialog.Title
      data-slot="sheet-title"
      className={cn('font-heading font-medium text-foreground', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </Dialog.Title>
  );
}
