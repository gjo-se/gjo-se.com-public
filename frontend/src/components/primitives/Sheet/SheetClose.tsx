import { Dialog } from '@base-ui/react/dialog';

/**
 * SheetClose – Button that programmatically closes the Sheet.
 */
export default function SheetClose({ ...domProps }: Record<string, unknown>) {
  return <Dialog.Close data-slot="sheet-close" {...domProps} />;
}
