/**
 * ExperienceSortableRow – Drag&Drop-fähige Tabellenzeile für Projekte.
 *
 * Zeigt Drag-Handle (⋮⋮) sowie reine Text-Zellen (Rolle, Zeitraum, Kontext,
 * Firma-intern) und Row-Actions (Bearbeiten-Overlay, Löschen mit Confirm).
 * Es gibt keinen Inline-Edit – die Felder werden im Overlay gepflegt.
 * Die `sort`-Reihenfolge wird ausschließlich über die Zeilenposition gesteuert.
 * Muster: CareerSortableRow.
 */
import Text from '@src/components/primitives/Text';
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';
import TableRowActions from '@src/components/table/TableRowActions';
import type { ExperienceOut } from '@src/lib/api/applicationProfile';

import { EXPERIENCE_COLUMNS, formatPeriod } from '../../utils/experienceColumns';

import type { ExperienceColumnKey } from '../../utils/experienceColumns';

interface ExperienceSortableRowProps {
  row: ExperienceOut;
  onEdit: (row: ExperienceOut) => void;
  onDelete: (id: number) => Promise<void>;
}

/** Maps a data column key to the plain-text cell value for one experience row. */
function cellText(row: ExperienceOut, colKey: ExperienceColumnKey): string {
  switch (colKey) {
    case 'position':
      return row.position;
    case 'period':
      return formatPeriod(row.startDate, row.endDate ?? null);
    case 'context':
      return row.translations?.de?.context ?? '—';
    case 'company':
      return row.company ?? '—';
    default:
      return '';
  }
}

/** Single sortable experience row with drag handle, text cells and actions. */
export default function ExperienceSortableRow({ row, onEdit, onDelete }: ExperienceSortableRowProps) {
  return (
    <SortableRow
      id={row.id}
      columns={EXPERIENCE_COLUMNS}
      trProps={{ 'data-experience-id': row.id }}
      renderColumn={(col) => {
        if (col.key === '_actions') {
          return (
            <TableCell key={col.key} compact>
              <TableRowActions
                onEdit={() => onEdit(row)}
                onDelete={() => onDelete(row.id)}
                deleteConfirmLabel="Projekt wirklich löschen?"
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={col.key}>
            <Text size="sm" color={col.muted ? 'muted' : undefined}>
              {cellText(row, col.key)}
            </Text>
          </TableCell>
        );
      }}
    />
  );
}
