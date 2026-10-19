import Button from '@src/components/primitives/Button';
import type { ButtonVariants } from '@src/components/primitives/Button/Button.variants';
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/primitives/Dialog';

import type { ReactNode } from 'react';

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  onCancel: () => void
  onConfirm: () => void
  /** Label of the cancel button, defaults to `Abbrechen`. */
  cancelLabel?: string
  /** Label of the confirm button, defaults to `Bestätigen`. */
  confirmLabel?: string
  /** Variant of the cancel button, defaults to `secondary`. */
  cancelVariant?: ButtonVariants['variant']
  /** Variant of the confirm button, defaults to `destructive`. */
  confirmVariant?: ButtonVariants['variant']
  /** Show the built-in × close button, defaults to `true`. */
  showCloseButton?: boolean
}

/** Generic confirmation dialog – the single basis for all "are you sure" flows. */
export default function ConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = 'Abbrechen',
  confirmLabel = 'Bestätigen',
  cancelVariant = 'secondary',
  confirmVariant = 'destructive',
  showCloseButton = true,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent showCloseButton={showCloseButton}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{description}</DialogDescription>
        <DialogFooter>
          <Button variant={cancelVariant} size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
