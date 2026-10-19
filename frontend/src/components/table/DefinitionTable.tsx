import { useCallback, useEffect, useRef, useState } from 'react';

import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';
import type { TableColumnProps } from '@src/components/table';
import { buildTableState } from '@src/components/table/buildTableState';
import { useTableUrlState } from '@src/components/table/useTableUrlState';
import { showErrorToast } from '@src/lib/errorToast';

export interface DefinitionTableProps<T> {
  /** URL-state key for the table (search/page/sort). */
  tableKey: string
  /** Loads all definition rows. */
  load: () => Promise<T[]>
  /** Persists a label/description patch for the row with the given numeric value. */
  update: (value: number, patch: { label?: string; description?: string }) => Promise<unknown>
  /** Extracts the numeric value field of a row (e.g. `importance` or `level`). */
  getValue: (row: T) => number
  /** Field key of the value column, used for the table column map. */
  valueField: string
  /** Header label of the value column (e.g. `Wert` or `Level`). */
  valueColumnLabel: string
  /** Error text shown when loading fails. */
  loadErrorMessage: string
  /** Toast text shown when a save fails. */
  saveErrorMessage: string
  /** Empty-state text when no definitions exist. */
  emptyMessage: string
}

/**
 * DefinitionTable – shared inline-edit management table for numeric
 * definitions (importance / level). Handles URL state, load, optimistic
 * label/description editing and error handling so the two definition tabs are
 * thin wrappers.
 */
export default function DefinitionTable<T>({
  tableKey,
  load,
  update,
  getValue,
  valueField,
  valueColumnLabel,
  loadErrorMessage,
  saveErrorMessage,
  emptyMessage,
}: DefinitionTableProps<T>) {
  const { q, page, size, sort, order, setQ, setPage, setSize, setSort, resetUrlState } =
    useTableUrlState(tableKey);

  const handleSearchChange = useCallback((value: string) => {
    setQ(value);
    setPage(0);
  }, [setQ, setPage]);

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await load());
    } catch {
      setError(loadErrorMessage);
    } finally {
      setLoading(false);
    }
  }, [load, loadErrorMessage]);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void reload();
  }, [reload]);

  const handleUpdateField = useCallback(
    async (value: number, field: 'label' | 'description', next: string) => {
      const trimmed = next.trim();
      if (!trimmed) return;
      const current = rows.find((row) => getValue(row) === value);
      if (!current || (current as Record<string, unknown>)[field] === trimmed) return;
      setRows((prev) =>
        prev.map((row) =>
          getValue(row) === value ? { ...row, [field]: trimmed } : row,
        ),
      );
      try {
        await update(value, { [field]: trimmed });
      } catch {
        showErrorToast(saveErrorMessage);
        await reload();
      }
    },
    [rows, getValue, update, saveErrorMessage, reload],
  );

  const columns: Record<string, TableColumnProps> = {
    [valueField]: { label: valueColumnLabel, width: '80px', defaultSort: 'asc' },
    label: {
      label: 'Label',
      width: '200px',
      search: true,
      inlineEdit: true,
      onInlineEdit: (row, value) => handleUpdateField(getValue(row as unknown as T), 'label', value),
    },
    description: {
      label: 'Beschreibung',
      search: true,
      inlineEdit: true,
      onInlineEdit: (row, value) => handleUpdateField(getValue(row as unknown as T), 'description', value),
    },
  };

  if (error) {
    return <Text as="p" size="sm" color="error">{error}</Text>;
  }

  return (
    <Table<T>
      table={buildTableState({
        data: rows, total: rows.length, q, page, size,
        sort, order, tableKey,
        setQ, setPage, setSize, setSort,
        handleSearchChange, resetUrlState,
      })}
      columns={columns}
      emptyMessage={loading ? 'Lädt…' : emptyMessage}
    />
  );
}
