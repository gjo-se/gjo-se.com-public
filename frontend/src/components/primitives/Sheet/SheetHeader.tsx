import { cn } from '@src/lib/utils';

import type { SheetHeaderProps } from './SheetHeader.interface';

/**
 * SheetHeader – Top section of the Sheet, typically containing the title and description.
 */
export default function SheetHeader({ children, ...domProps }: SheetHeaderProps) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5 p-4', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </div>
  );
}
