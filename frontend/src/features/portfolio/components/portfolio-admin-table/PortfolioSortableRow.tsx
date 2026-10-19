/**
 * PortfolioSortableRow – Drag&Drop-fähige Tabellenzeile für die Admin-Liste.
 *
 * Zeigt Drag-Handle (⋮⋮), Titel, Slug, Inline-Edit für year/link_url/link_label
 * sowie Row-Actions (Bearbeiten → DetailPage, Löschen). Die `sort`-Reihenfolge
 * wird ausschließlich über die Zeilenposition gesteuert (keine Sort-Spalte).
 */

import StatusCell from '@src/components/atoms/StatusCell/StatusCell';
import SortableRow from '@src/components/table/SortableRow';
import TableCell from '@src/components/table/TableCell';
import TableRowActions from '@src/components/table/TableRowActions';

import {
  PORTFOLIO_COLUMNS,
  PORTFOLIO_ROW_HEIGHT,
} from '../../utils/portfolioAdminTableColumns';

import type { PortfolioAdminRow } from '../../hooks/usePortfolioAdminTable';

interface PortfolioSortableRowProps {
  row: PortfolioAdminRow;
  /** True while a search filter is active – disables dragging to keep sort safe. */
  sortableEnabled: boolean;
  onEdit: (row: PortfolioAdminRow) => void;
  onDelete: (slug: string) => Promise<string | null>;
}

/** Single sortable portfolio row with drag handle and row actions. */
export default function PortfolioSortableRow({
  row,
  sortableEnabled,
  onEdit,
  onDelete,
}: PortfolioSortableRowProps) {
  return (
    <SortableRow
      id={row.slug}
      columns={PORTFOLIO_COLUMNS}
      disabled={!sortableEnabled}
      rowHeight={PORTFOLIO_ROW_HEIGHT}
      trProps={{ 'data-portfolio-slug': row.slug }}
      renderColumn={(col) => {
        if (col.key === '_drag') return null;
        if (col.key === '_actions') {
          return (
            <TableCell key={col.key} compact>
              <TableRowActions
                onEdit={() => onEdit(row)}
                onDelete={() => {
                  void onDelete(row.slug);
                }}
              />
            </TableCell>
          );
        }
        if (col.key === 'status') {
          return (
            <TableCell key={col.key} alignment="center">
              <StatusCell
                statusableType="portfolio"
                statusableId={row.id}
                currentStatus={row.status}
                currentColor={row.status_color_token}
              />
            </TableCell>
          );
        }
        return (
          <TableCell key={col.key}>
            {String(row[col.key] ?? '')}
          </TableCell>
        );
      }}
    />
  );
}
