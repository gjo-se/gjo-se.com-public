import { Dialog } from '@base-ui/react/dialog';

import type { SheetProps } from './Sheet.interface';

/**
 * Sheet – Slide-in panel overlay (drawer).
 */
export default function Sheet({ children, ...domProps }: SheetProps) {
  return (
    <Dialog.Root data-slot="sheet" {...domProps}>
      {children}
    </Dialog.Root>
  );
}
