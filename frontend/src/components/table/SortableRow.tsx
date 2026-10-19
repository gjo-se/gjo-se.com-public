/**
 * SortableRow – generic `<tr>` shell for drag&drop table rows.
 *
 * Owns the `useSortableRow` wiring, the `<tr>` element and the shared `_drag`
 * column (centered `DragHandle` cell). Every other column is rendered by the
 * caller via `renderColumn`, which returns the complete `<TableCell>`.
 */
import DragHandle from './DragHandle';
import TableCell from './TableCell';
import { useSortableRow } from './useSortableRow';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/** Minimal column contract: every column needs a stable `key`. */
export interface SortableRowColumn {
  key: string;
}

export interface SortableRowProps<C extends SortableRowColumn> {
  /** Row id handed to dnd-kit. */
  id: number | string;
  /** Column definitions driving the cell order. */
  columns: C[];
  /** Renders the full `<TableCell>` for any non-`_drag` column. */
  renderColumn: (col: C) => ReactNode;
  /** Disables dragging for this row. */
  disabled?: boolean;
  /** Fixed row height in px (consistent drag alignment). */
  rowHeight?: number;
  /** Extra `<tr>` attributes, e.g. `data-*` hooks. */
  trProps?: ComponentPropsWithoutRef<'tr'> & Record<`data-${string}`, string | number | boolean | undefined>;
}

/** Sortable table row with a shared drag-handle cell. */
export default function SortableRow<C extends SortableRowColumn>({
  id,
  columns,
  renderColumn,
  disabled = false,
  rowHeight,
  trProps,
}: SortableRowProps<C>) {
  const { setNodeRef, style, dragProps: sortableDragProps } = useSortableRow(id, {
    disabled,
    rowHeight,
  });
  const dragProps = disabled ? {} : sortableDragProps;

  return (
    <tr ref={setNodeRef} style={style} {...trProps}>
      {columns.map((col) =>
        col.key === '_drag' ? (
          <TableCell key={col.key} compact alignment="center">
            <DragHandle {...dragProps} />
          </TableCell>
        ) : (
          renderColumn(col)
        ),
      )}
    </tr>
  );
}
