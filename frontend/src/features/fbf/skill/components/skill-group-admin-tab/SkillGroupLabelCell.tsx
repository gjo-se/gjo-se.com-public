/**
 * SkillGroupLabelCell – Inline-Edit-Zelle fuer das lokalisierte Gruppen-Label.
 *
 * Muster analog QuestionCell/StatementCell: Idle rendert das Label als Text
 * (oder „–" bei leer), Klick → Input (Enter/Blur → Save, Escape → Cancel).
 */

import InlineEditCell from '@src/components/table/InlineEditCell';

interface SkillGroupLabelCellProps {
  value: string
  /** Persistiert das Label; schliesst den Edit-Modus. */
  onSave: (label: string) => void
}

/** Inline-Edit-Zelle fuer das lokalisierte Gruppen-Label (DE/EN). */
export default function SkillGroupLabelCell({ value, onSave }: SkillGroupLabelCellProps) {
  return (
    <InlineEditCell
      value={value}
      onSave={onSave}
      variant="input"
      ariaLabel="Gruppenlabel"
      renderDisplay={(v) => (v.trim() ? v : '\u2013')}
    />
  );
}
