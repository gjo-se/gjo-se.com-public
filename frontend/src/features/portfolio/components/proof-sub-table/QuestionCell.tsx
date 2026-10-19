import InlineEditCell from '@src/components/table/InlineEditCell';

interface QuestionCellProps {
  /** Vertrauensfrage der aktuellen Locale ('' wenn nicht vorhanden). */
  value: string;
  /** Persistiert die Frage; schließt den Edit-Modus. */
  onSave: (question: string) => void;
}

/**
 * QuestionCell – Inline-Edit-Zelle für die Vertrauensfrage eines Proofs.
 *
 * Muster wie StatementCell: Idle rendert die Frage als Text (oder „–" bei leer),
 * Klick → Textarea (Cmd+Enter/Blur → Save, Escape → Cancel).
 */
export default function QuestionCell({ value, onSave }: QuestionCellProps) {
  return (
    <InlineEditCell
      value={value}
      onSave={onSave}
      renderDisplay={(v) => (v.trim() ? v : '\u2013')}
    />
  );
}
