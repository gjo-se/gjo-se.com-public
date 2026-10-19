/**
 * CareerSortableRow – Drag&Drop-fähige Tabellenzeile für die Karriere.
 *
 * Zeigt Drag-Handle (⋮⋮), Zellen via CareerEntryCell (Inline-Edit,
 * DateInput, Textarea) sowie Row-Actions (Löschen mit Dialog). Die
 * `sort`-Reihenfolge wird ausschließlich über die Zeilenposition gesteuert
 * (keine Sort-Spalte). Muster: PortfolioSortableRow.
 */
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';
import TableRowActions from '@src/components/table/TableRowActions';

import { CAREER_COLUMNS } from '../../utils/careerEntryColumns';

import CareerEntryCell from './CareerEntryCell';

import type { CareerRow } from '../../hooks/useCareerEntryTable';

interface CareerSortableRowProps {
  row: CareerRow;
  /** True while a search filter is active – disables dragging to keep sort safe. */
  sortableEnabled: boolean;
  onFieldSave: (row: CareerRow, field: string, value: string) => void | Promise<void>;
  onDelete: (row: CareerRow) => Promise<void>;
}

/** Single sortable career row with drag handle, inline-edit cells and actions. */
export default function CareerSortableRow({
  row,
  sortableEnabled,
  onFieldSave,
  onDelete,
}: CareerSortableRowProps) {
  return (
    <SortableRow
      id={row.id}
      columns={CAREER_COLUMNS}
      disabled={!sortableEnabled}
      trProps={{ 'data-career-id': row.id }}
      renderColumn={(col) => {
        if (col.key === '_actions') {
          return (
            <TableCell key={col.key} compact>
              <TableRowActions
                onDelete={() => onDelete(row)}
                deleteConfirmLabel="Karriere-Station wirklich löschen?"
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={col.key}>
            <CareerEntryCell row={row} colKey={col.key} onFieldSave={onFieldSave} />
          </TableCell>
        );
      }}
    />
  );
}
