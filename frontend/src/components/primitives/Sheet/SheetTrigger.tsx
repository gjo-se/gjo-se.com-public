import { Dialog } from '@base-ui/react/dialog';

import type { SheetTriggerProps } from './SheetTrigger.interface';

/**
 * SheetTrigger – Button or element that opens the Sheet.
 */
export default function SheetTrigger({ children, ...domProps }: SheetTriggerProps) {
  return <Dialog.Trigger data-slot="sheet-trigger" {...domProps}>{children}</Dialog.Trigger>;
}
