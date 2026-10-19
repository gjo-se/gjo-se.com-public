import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import { cn } from '@src/lib/utils';

import { alertDialogVariants } from './AlertDialog.variants';

import type { AlertDialogProps } from './AlertDialog.interface';

/**
 * AlertDialog – Confirmation dialog for destructive or important actions.
 */
export default function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = 'Abbrechen',
  confirmLabel = 'Bestätigen',
  onConfirm,
  destructive = false,
  ...domProps
}: AlertDialogProps) {
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 z-50 bg-black/50 transition-opacity',
            alertDialogVariants(),
          )}
          {...domProps}
        />
        <AlertDialogPrimitive.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
            <AlertDialogPrimitive.Title>
              <Text variant="h3" weight="semibold">{title}</Text>
            </AlertDialogPrimitive.Title>
            {description && (
              <AlertDialogPrimitive.Description className="mt-2">
                <Text variant="body" color="muted">{description}</Text>
              </AlertDialogPrimitive.Description>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <AlertDialogPrimitive.Close
                render={<Button variant="secondary">{cancelLabel}</Button>}
              />
              <AlertDialogPrimitive.Close
                render={(
                  <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
                    {confirmLabel}
                  </Button>
                )}
              />
            </div>
          </div>
        </AlertDialogPrimitive.Popup>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
