import ConfirmDialog from '@src/components/molecules/ConfirmDialog/ConfirmDialog';

/**
 * DeleteConfirmDialog – generischer Lösch-Bestätigungsdialog für Tabellen.
 *
 * Dünne Fassade über `ConfirmDialog`: ghost „Abbrechen" + destruktives „Löschen".
 */

export interface DeleteConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation dialog with a ghost "Abbrechen" and destructive "Löschen" button. */
export function DeleteConfirmDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelVariant="ghost"
      confirmLabel="Löschen"
    />
  );
}
