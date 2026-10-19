import { Dialog } from '@base-ui/react/dialog';

import { cn } from '@src/lib/utils';

import type { SheetDescriptionProps } from './SheetDescription.interface';

/**
 * SheetDescription – Optional descriptive text below the Sheet title.
 */
export default function SheetDescription({ children, ...domProps }: SheetDescriptionProps) {
  return (
    <Dialog.Description
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', (domProps as Record<string, unknown>).className as string)}
      {...domProps}
    >
      {children}
    </Dialog.Description>
  );
}
