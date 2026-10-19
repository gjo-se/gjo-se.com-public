import { flexRender, type Row } from '@tanstack/react-table';
import { useState } from 'react';

import Text from '@src/components/primitives/Text';

import TableBody from './TableBody';
import TableCell from './TableCell';
import TableHead from './TableHead';
import TableHeader from './TableHeader';
import TableRoot from './TableRoot';
import TableRow from './TableRow';
import { syncActiveIdToUrl } from './useTableUrlState';

import type { TableColumnMetaProps } from './TableColumnMeta.interface';
import type { TableRendererProps } from './TableRenderer.interface';

/** Internal table body renderer using presentational primitives, no raw HTML tags. */
export default function TableRenderer<TData>({
  table,
  tableKey,
  isLoading = false,
  emptyMessage = 'Keine Einträge gefunden.',
  onRowClick,
  activeRowId: activeRowIdProp,
  getRowVariant,
  ghostRowElement,
  footerElement,
}: TableRendererProps<TData>) {
  const [internalActiveRowId, setInternalActiveRowId] = useState<string>(() => {
    if (!tableKey) return '';
    return new URLSearchParams(window.location.search).get('activeId') ?? '';
  });

  const activeRowId = tableKey ? internalActiveRowId : activeRowIdProp;

  const handleRowClick = (row: Row<TData>) => {
    if (tableKey) {
      const id = row.id;
      setInternalActiveRowId(id);
      syncActiveIdToUrl(tableKey, id);
    }
    onRowClick?.(row);
  };

  const rows = table.getRowModel().rows;

  if (isLoading && rows.length === 0) {
    return (
      <div className="py-4">
        <Text size="sm" color="muted">
          Laden…
        </Text>
      </div>
    );
  }
  const hasGhostRow = Boolean(ghostRowElement);

  if (rows.length === 0 && !hasGhostRow) {
    return (
      <div className="py-4">
        <Text size="sm" color="muted">
          {emptyMessage}
        </Text>
      </div>
    );
  }

  return (
    <TableRoot>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta as TableColumnMetaProps | undefined;
              return (
                <TableHead
                  key={header.id}
                  style={
                  meta?.width
                    ? { maxWidth: meta.width, width: meta.width }
                    : undefined
                }
                  compact={meta?.compact}
                  alignment={meta?.alignment}
                  onClick={header.column.getToggleSortingHandler()}
                  aria-sort={
                  header.column.getIsSorted()
                    ? header.column.getIsSorted() === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                }
                >
                  {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getCanSort() && (
                  <Text as="span" color="muted">
                    {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ' ↕'}
                  </Text>
                )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {ghostRowElement}
        {rows.map((row) => {
          const isActive =
            activeRowId !== undefined && activeRowId !== '' && row.id === activeRowId;
          return (
            <TableRow
              key={row.id}
              variant={getRowVariant?.(row.original)}
              data-state={
                isActive
                  ? 'selected'
                  : row.getIsSelected()
                    ? 'selected'
                    : undefined
              }
              onClick={() => handleRowClick(row)}
            >
              {row.getVisibleCells().map((cell) => {
                const meta = cell.column.columnDef.meta as TableColumnMetaProps | undefined;
                return (
                  <TableCell
                    key={cell.id}
                    style={
                    meta?.width
                      ? { maxWidth: meta.width, width: meta.width }
                      : undefined
                  }
                    compact={meta?.compact}
                    alignment={meta?.alignment}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
      {footerElement}
    </TableRoot>
  );
}
