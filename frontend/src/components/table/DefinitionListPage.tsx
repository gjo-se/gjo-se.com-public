/**
 * DefinitionListPage – generische Table-Only-Admin-Page für die Core-
 * Definitions-Tabellen (Tags/Status).
 *
 * Kapselt das kopierte Seiten-Gerüst: `PageHeader` + Fehlerzustand + `Table`
 * mit Kategorie-`FilterCombobox` und optionalem Kind-Slot (z. B. Usage-Sheet).
 */


import type { DropdownItem } from '@src/components/molecules/Dropdown/Dropdown';
import FilterCombobox from '@src/components/molecules/FilterCombobox/FilterCombobox';
import PageHeader from '@src/components/molecules/PageHeader/PageHeader';
import Text from '@src/components/primitives/Text';
import Table from '@src/components/table';
import type { TableColumnProps, TableRowActionsProps, TableStateProps } from '@src/components/table';

import type { ReactNode } from 'react';

export interface DefinitionListPageProps<T> {
  title: string;
  table: TableStateProps<T>;
  columns: Record<string, TableColumnProps>;
  rowActions: TableRowActionsProps<T>[];
  loading: boolean;
  error: string | null;
  onGhostCreate: (data: Record<string, unknown>) => Promise<unknown>;
  emptyMessage: string;
  categoryFilter: string;
  categoryOptions: DropdownItem[];
  onCategoryFilterChange: (value: string) => void;
  /** Optional slot rendered after the table (e.g. a usage sheet). */
  children?: ReactNode;
}

/** Renders the shared Core-definition table page shell. */
export function DefinitionListPage<T>({
  title,
  table,
  columns,
  rowActions,
  loading,
  error,
  onGhostCreate,
  emptyMessage,
  categoryFilter,
  categoryOptions,
  onCategoryFilterChange,
  children,
}: DefinitionListPageProps<T>) {
  if (error) {
    return (
      <>
        <PageHeader title={title} />
        <Text as="p" size="sm" color="error">
          Fehler: {error}
        </Text>
      </>
    );
  }

  return (
    <>
      <PageHeader title={title} />

      <Table<T>
        table={table}
        columns={columns}
        rowActions={rowActions}
        emptyMessage={emptyMessage}
        ghostRow
        onGhostCreate={onGhostCreate}
        isLoading={loading && table.data.length > 0}
      >
        <FilterCombobox
          items={categoryOptions}
          selectedValue={categoryFilter || 'all'}
          onSelect={onCategoryFilterChange}
          placeholder="Kategorie"
          compact
        />
      </Table>

      {children}
    </>
  );
}
