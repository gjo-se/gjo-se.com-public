/**
 * DecisionSortableRow – Drag&Drop-fähige Zeile der DecisionSubTable.
 *
 * Zeigt Drag-Handle (⋮⋮), die Felder der AKTIVEN Sprache als inline-editierbare
 * Zellen (`title` Text, `body`/`discarded` Textarea) und die Lösch-Action mit
 * Confirm. Muster: CareerSortableRow.
 */
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';
import TableInlineEditCell from '@src/components/table/TableInlineEditCell';
import TableRowActions from '@src/components/table/TableRowActions';
import type { DecisionLocaleFields } from '@src/lib/api/applicationProfile';

import type { DecisionRow } from './DecisionSubTable';

interface DecisionSortableRowProps {
  row: DecisionRow;
  locale: 'de' | 'en';
  onFieldChange: (key: string, field: keyof DecisionLocaleFields, value: string) => void;
  onDelete: (key: string) => void;
}

const DECISION_ROW_COLUMNS: { key: string }[] = [
  { key: '_drag' },
  { key: 'title' },
  { key: 'body' },
  { key: 'discarded' },
  { key: '_actions' },
];

/** Single sortable decision row (drag handle, inline-edit cells, delete). */
export default function DecisionSortableRow({
  row,
  locale,
  onFieldChange,
  onDelete,
}: DecisionSortableRowProps) {
  const fields = row.translations[locale] ?? {};

  return (
    <SortableRow
      id={row.key}
      columns={DECISION_ROW_COLUMNS}
      renderColumn={(col) => {
        if (col.key === '_actions') {
          return (
            <TableCell key={col.key} compact>
              <TableRowActions
                onDelete={() => onDelete(row.key)}
                deleteConfirmLabel="Entscheidung wirklich löschen?"
              />
            </TableCell>
          );
        }
        if (col.key === 'title') {
          return (
            <TableCell key={col.key}>
              <TableInlineEditCell
                value={fields.title ?? ''}
                onSave={(v) => onFieldChange(row.key, 'title', v)}
              />
            </TableCell>
          );
        }
        if (col.key === 'body') {
          return (
            <TableCell key={col.key}>
              <TableInlineEditCell
                value={fields.body ?? ''}
                textarea
                onSave={(v) => onFieldChange(row.key, 'body', v)}
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={col.key}>
            <TableInlineEditCell
              value={fields.discarded ?? ''}
              textarea
              onSave={(v) => onFieldChange(row.key, 'discarded', v)}
            />
          </TableCell>
        );
      }}
    />
  );
}
