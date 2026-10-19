import Markdown from '@src/components/primitives/Markdown/Markdown';
import InlineEditCell from '@src/components/table/InlineEditCell';

interface StatementCellProps {
  /** Statement der aktuellen Locale ('' wenn nicht vorhanden). */
  value: string;
  /** Persistiert das Statement; schließt den Edit-Modus. */
  onSave: (statement: string) => void;
}

/**
 * StatementCell – Inline-Edit-Zelle mit Markdown-Unterstützung.
 *
 * Muster wie die STORY-Felder (InlineMarkdownEditRow): Idle rendert das
 * Statement als Markdown (oder „–" bei leer), Klick → Textarea
 * (Cmd+Enter/Blur → Save, Escape → Cancel).
 */
export default function StatementCell({ value, onSave }: StatementCellProps) {
  return (
    <InlineEditCell
      value={value}
      onSave={onSave}
      renderDisplay={(v) => (v.trim() ? <Markdown>{v}</Markdown> : '\u2013')}
    />
  );
}
