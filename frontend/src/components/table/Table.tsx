import { useCallback, useEffect, useMemo, useState } from 'react';

import Checkbox from '@src/components/primitives/Checkbox';
import Combobox from '@src/components/primitives/Combobox';
import ComboboxContent from '@src/components/primitives/Combobox/ComboboxContent';
import ComboboxEmpty from '@src/components/primitives/Combobox/ComboboxEmpty';
import ComboboxInput from '@src/components/primitives/Combobox/ComboboxInput';
import ComboboxItem from '@src/components/primitives/Combobox/ComboboxItem';
import ComboboxList from '@src/components/primitives/Combobox/ComboboxList';
import DateInput from '@src/components/primitives/DateInput/DateInput';
import Input from '@src/components/primitives/Input';
import { showErrorToast } from '@src/lib/errorToast';

import TableBulkBar from './TableBulkBar';
import TableCell from './TableCell';
import TablePagination from './TablePagination';
import TableRenderer from './TableRenderer';
import TableRow from './TableRow';
import TableToolbar from './TableToolbar';
import { useTable } from './useTable';
import { useTableColumns } from './useTableColumns';
import { useTableFilters } from './useTableFilters';

import type { TableProps } from './Table.interface';
import type { TableRowActionsProps } from './TableRowActions.interface';

// ── Ghost Row helpers ─────────────────────────────────────────────────────

interface GhostColumn {
  key: string
  label: string
  input?: 'text' | 'combobox' | 'checkbox' | 'date' | 'textarea'
  options?: { value: string; label: string }[]
  placeholder?: string
  renderCell?: (props: { value: unknown; onChange: (value: unknown) => void; disabled: boolean }) => React.ReactNode
}

/** Derives ghost columns from the TableColumnProps map. */
function deriveGhostColumns(columns: Record<string, import('./TableColumn.interface').TableColumnProps>): GhostColumn[] {
  return Object.entries(columns)
    .filter(([, col]) => col.ghostInput || col.ghostRenderCell)
    .map(([key, col]) => ({
      key,
      label: col.label,
      input: col.ghostInput,
      options: col.ghostOptions,
      placeholder: col.ghostPlaceholder ?? col.label,
      renderCell: col.ghostRenderCell,
    }));
}

/** Compound table component. */
export default function Table<T>({
  table: tableState,
  columns,
  rowActions,
  emptyMessage = 'Keine Einträge gefunden.',
  onReset,
  getRowVariant,
  bulkActions,
  ghostRow,
  onGhostCreate,
  isLoading = false,
  children,
  footer,
}: TableProps<T>) {
  const {
    data, total, q, sort, order, page, size, tableKey,
    setSort, setPage, setSize, handleSearchChange, resetUrlState,
  } = tableState;

  const enableSelection = Boolean(bulkActions && bulkActions.length > 0);
  const columnDefs = useTableColumns<T>(columns, rowActions as TableRowActionsProps<T>[] | undefined, enableSelection);

  const searchableColumnIds = useMemo(
    () =>
      Object.entries(columns)
        .filter(([, col]) => col.search)
        .map(([key]) => key),
    [columns],
  );

  const defaultSortField = useMemo(() => {
    const entry = Object.entries(columns).find(([, col]) => col.defaultSort);
    return entry ? entry[0] : undefined;
  }, [columns]);

  const urlStateRecord: Record<string, unknown> = useMemo(
    () => ({ q, sort, order, page, size }),
    [q, sort, order, page, size],
  );
  const filterElements = useTableFilters(columns, urlStateRecord);

  const tanstackTable = useTable<T>({
    data,
    columns: columnDefs,
    totalCount: total,
    pageIndex: page,
    pageSize: size,
    sortField: sort || defaultSortField || '',
    sortOrder: (order as 'asc' | 'desc') || 'desc',
    setPage,
    setSize,
    setSort,
    defaultSortField,
    searchQuery: q,
    searchableColumnIds,
  });

  const hasRows = tanstackTable.getRowModel().rows.length > 0;
  const dataLength = total ?? tanstackTable.getFilteredRowModel().rows.length;
  const showPagination = dataLength > 20;

  const selectedRows = enableSelection
    ? tanstackTable.getSelectedRowModel().rows.map((row) => row.original)
    : [];

  // ── Ghost Row State Machine ───────────────────────────────────────────
  const ghostColumns = useMemo(() => deriveGhostColumns(columns), [columns]);
  const ghostEnabled = ghostRow && ghostColumns.length > 0 && onGhostCreate;

  const [ghostOpen, setGhostOpen] = useState(false);
  const [ghostData, setGhostData] = useState<Record<string, unknown>>({});
  const [ghostSaving, setGhostSaving] = useState(false);
  const [ghostSearch, setGhostSearch] = useState<Record<string, string>>({});

  const initGhostDefaults = useCallback(() => {
    const defaults: Record<string, unknown> = {};
    ghostColumns.forEach((col) => {
      if (col.input === 'checkbox') {
        defaults[col.key] = (columns[col.key]?.ghostDefault as boolean) ?? false;
      } else {
        defaults[col.key] = (columns[col.key]?.ghostDefault as string) ?? '';
      }
    });
    return defaults;
  }, [ghostColumns, columns]);

  // Cmd+Enter opens ghost
  useEffect(() => {
    if (!ghostEnabled) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (ghostOpen) return;
        e.preventDefault();
        setGhostData(initGhostDefaults());
        setGhostSearch({});
        setGhostOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ghostEnabled, ghostOpen, initGhostDefaults]);

  // Enter when ghost is open (bubble phase so combobox selection works first)
  useEffect(() => {
    if (!ghostOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !ghostSaving) {
        // Allow newlines in textarea fields – don't submit the ghost row
        if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (!onGhostCreate) return;
        setGhostSaving(true);
        void onGhostCreate(ghostData).then(() => {
          setGhostOpen(false);
        }).catch((err: unknown) => {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
          const msg = detail
            ?? (err as { message?: string })?.message
            ?? 'Fehler beim Erstellen.';
          showErrorToast(msg);
        }).finally(() => {
          setGhostSaving(false);
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ghostOpen, ghostData, ghostSaving, onGhostCreate]);

  // Escape when ghost is open (capture phase to beat combobox popover ESC)
  useEffect(() => {
    if (!ghostOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGhostOpen(false);
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [ghostOpen]);

  const updateGhostField = useCallback((key: string, value: unknown) => {
    setGhostData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Ghost row input renderer ──────────────────────────────────────────

  const renderGhostCell = useCallback((columnId: string, autoFocus: boolean) => {
    const col = ghostColumns.find((g) => g.key === columnId);
    if (!col) return null; // empty cell for alignment
    const val = ghostData[col.key];
    const disabled = ghostSaving;

    // Custom ghost renderer takes precedence over built-in input types
    if (col.renderCell) {
      return col.renderCell({
        value: val,
        onChange: (v: unknown) => updateGhostField(col.key, v),
        disabled,
      });
    }

    switch (col.input) {
      case 'checkbox':
        return (
          <div className="flex justify-center">
            <Checkbox
              checked={Boolean(val)}
              onChange={(v) => updateGhostField(col.key, v)}
              disabled={disabled}
              label={col.label}
            />
          </div>
        );
      case 'combobox': {
        const search = ghostSearch[col.key] ?? '';
        const filtered = search.trim()
          ? (col.options ?? []).filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
          : (col.options ?? []);
        return (
          <Combobox
            {...({ value: String(val ?? ''), onValueChange: (newValue: string) => {
              updateGhostField(col.key, newValue);
              const selected = (col.options ?? []).find((o) => o.value === newValue);
              setGhostSearch((prev) => ({ ...prev, [col.key]: selected?.label ?? '' }));
            } } as Record<string, unknown>)}
          >
            <ComboboxInput
              autoFocus={autoFocus}
              placeholder={col.placeholder}
              value={search}
              onChange={(e) => setGhostSearch((prev) => ({ ...prev, [col.key]: (e.target as HTMLInputElement).value }))}
            />
            <ComboboxContent>
              <ComboboxList>
                {filtered.map((item) => (
                  <ComboboxItem key={item.value} {...({ value: item.value } as Record<string, unknown>)}>
                    {item.label}
                  </ComboboxItem>
                ))}
              </ComboboxList>
              {filtered.length === 0 && search.trim() && (
                <ComboboxEmpty>Keine Einträge</ComboboxEmpty>
              )}
            </ComboboxContent>
          </Combobox>
        );
      }
      case 'date':
        return (
          <DateInput
            value={String(val ?? '')}
            onChange={(iso) => updateGhostField(col.key, iso)}
          />
        );
      case 'textarea':
        return (
          <textarea
            autoFocus={autoFocus}
            value={String(val ?? '')}
            onChange={(e) => updateGhostField(col.key, e.target.value)}
            placeholder={col.placeholder}
            disabled={disabled}
            rows={2}
            className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 resize-y"
          />
        );
      default:
        return (
          <Input
            autoFocus={autoFocus}
            value={String(val ?? '')}
            onChange={(e) => updateGhostField(col.key, e.target.value)}
            placeholder={col.placeholder}
            disabled={disabled}
          />
        );
    }
  }, [ghostColumns, ghostData, ghostSaving, ghostSearch, updateGhostField]);

  // ── Build ghost row element matching the real column structure ────────

  const ghostRowElement = useMemo(() => {
    if (!ghostOpen) return null;

    const leafColumns = tanstackTable.getAllLeafColumns();
    const firstGhostKey = ghostColumns.find((g) => leafColumns.some((col) => col.id === g.key))?.key;
    return (
      <TableRow muted>
        {leafColumns.map((col) => {
          const autoFocus = col.id === firstGhostKey;
          const cellContent = renderGhostCell(col.id, autoFocus);
          return (
            <TableCell key={col.id}>
              {cellContent}
            </TableCell>
          );
        })}
      </TableRow>
    );
  }, [ghostOpen, ghostColumns, renderGhostCell, tanstackTable]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <TableToolbar
        searchValue={q}
        onSearchChange={handleSearchChange}
        onReset={() => {
          onReset?.();
          resetUrlState();
        }}
        total={dataLength}
        loading={false}
        filterElements={filterElements}
      >
        {children}
      </TableToolbar>

      {enableSelection && bulkActions && (
        <TableBulkBar
          selectedRows={selectedRows}
          bulkActions={bulkActions}
          onClearSelection={() => tanstackTable.resetRowSelection()}
        />
      )}

      <TableRenderer
        table={tanstackTable}
        tableKey={tableKey}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        getRowVariant={getRowVariant}
        ghostRowElement={ghostRowElement}
        footerElement={footer}
      />

      {showPagination && hasRows && (
        <TablePagination
          table={tanstackTable}
          totalCount={total ?? tanstackTable.getFilteredRowModel().rows.length}
        />
      )}
    </>
  );
}
