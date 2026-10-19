/**
 * CareerGhostRow – Inline-Erstellungszeile für neue Karriere-Stationen.
 *
 * Inputs werden aus den Ghost-Spalten-Definitionen (CAREER_COLUMNS)
 * abgeleitet; Pflichtfeld-Validierung erfolgt über validateCareerGhost.
 * Enter submittet (außer in Textareas), Escape schließt (im Parent).
 */
import { GhostRowField } from '@src/components/table/GhostRowField';
import TableCell from '@src/components/table/TableCell';

import { CAREER_COLUMNS } from '../../utils/careerEntryColumns';

import type { CareerColumnDef } from '../../utils/careerEntryColumns';

interface CareerGhostRowProps {
  saving: boolean;
  data: Record<string, string>;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
}

/** Inline creation row: inputs derived from the ghost column definitions. */
export default function CareerGhostRow({ saving, data, onChange, onSubmit }: CareerGhostRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) {
      // Allow newlines in textarea fields – don't submit the ghost row
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      e.preventDefault();
      onSubmit();
    }
  };

  const renderGhostInput = (col: CareerColumnDef) => {
    if (!col.ghost) return null;
    return (
      <GhostRowField
        ghost={col.ghost}
        value={data[col.key] ?? ''}
        placeholder={col.ghostPlaceholder}
        disabled={saving}
        onValueChange={(value) => onChange(col.key, value)}
        onKeyDown={handleKeyDown}
      />
    );
  };

  return (
    <tr className="bg-gray-50 dark:bg-gray-800/50">
      {CAREER_COLUMNS.map((col) => (
        <TableCell key={col.key} compact={col.compact}>
          {renderGhostInput(col)}
        </TableCell>
      ))}
    </tr>
  );
}
