/**
 * ProofSortableRow – Drag&Drop-fähige Zeile der ProofSubTable.
 *
 * Zeigt Drag-Handle (⋮⋮), das Proof-Feld der AKTIVEN Sprache als
 * inline-editierbare Textarea und die Lösch-Action mit Confirm.
 * Muster: CareerSortableRow.
 */
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';
import TableInlineEditCell from '@src/components/table/TableInlineEditCell';
import TableRowActions from '@src/components/table/TableRowActions';

import type { ProofRow } from './ProofSubTable';

interface ProofSortableRowProps {
  row: ProofRow;
  locale: 'de' | 'en';
  onFieldChange: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}

const PROOF_ROW_COLUMNS: { key: string }[] = [
  { key: '_drag' },
  { key: 'text' },
  { key: '_actions' },
];

/** Single sortable proof row (drag handle, inline-edit cell, delete). */
export default function ProofSortableRow({
  row,
  locale,
  onFieldChange,
  onDelete,
}: ProofSortableRowProps) {
  const fields = row.translations[locale] ?? {};

  return (
    <SortableRow
      id={row.key}
      columns={PROOF_ROW_COLUMNS}
      renderColumn={(col) => {
        if (col.key === '_actions') {
          return (
            <TableCell key={col.key} compact>
              <TableRowActions
                onDelete={() => onDelete(row.key)}
                deleteConfirmLabel="Proof wirklich löschen?"
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={col.key}>
            <TableInlineEditCell
              value={fields.text ?? ''}
              textarea
              onSave={(v) => onFieldChange(row.key, v)}
            />
          </TableCell>
        );
      }}
    />
  );
}
