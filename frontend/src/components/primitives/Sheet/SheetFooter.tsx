import { cn } from '@src/lib/utils';

import type { SheetFooterProps } from './SheetFooter.interface';

/**
 * SheetFooter – Bottom section of the Sheet, typically containing action buttons.
 */
export default function SheetFooter({ children, ...domProps }: SheetFooterProps) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </div>
  );
}
