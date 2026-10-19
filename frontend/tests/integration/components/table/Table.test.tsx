import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import Table from '@src/components/table/Table';
import { buildTableState } from '@src/components/table/buildTableState';

import type { TableColumnProps } from '@src/components/table/TableColumn.interface';
import type { TableStateProps } from '@src/components/table/TableState.interface';

interface Row {
  id: number;
  name: string;
}

const COLUMNS: Record<string, TableColumnProps> = {
  name: { label: 'Name', search: true },
};

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `Zeile ${index + 1}` }));
}

function buildState(rows: Row[], overrides: Partial<TableStateProps<Row>> = {}): TableStateProps<Row> {
  return {
    ...buildTableState<Row>({
      data: rows,
      total: rows.length,
      q: '',
      page: 0,
      size: 20,
      sort: '',
      order: 'desc',
      tableKey: 'table-component-test',
      setQ: vi.fn(),
      setPage: vi.fn(),
      setSize: vi.fn(),
      setSort: vi.fn(),
      handleSearchChange: vi.fn(),
      resetUrlState: vi.fn(),
    }),
    ...overrides,
  };
}

describe('Table', () => {
  it('renders the toolbar with the entry count and the rows', () => {
    render(<Table table={buildState(buildRows(2))} columns={COLUMNS} />);

    expect(screen.getByPlaceholderText('Suchen…')).toBeVisible();
    expect(screen.getByText('2 Einträge')).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Zeile 1' })).toBeVisible();
  });

  it('shows the empty message without rows', () => {
    render(<Table table={buildState([])} columns={COLUMNS} emptyMessage="Keine Daten." />);

    expect(screen.getByText('Keine Daten.')).toBeVisible();
  });

  it('reports the search input change', async () => {
    const handleSearchChange = vi.fn();
    const state = buildState(buildRows(1), { handleSearchChange });
    render(<Table table={state} columns={COLUMNS} />);

    await userEvent.fill(screen.getByPlaceholderText('Suchen…'), 'Al');

    expect(handleSearchChange).toHaveBeenCalledWith('Al');
  });

  it('reports sorting on a column header', async () => {
    const setSort = vi.fn();
    const state = buildState(buildRows(2), { setSort });
    render(<Table table={state} columns={COLUMNS} />);

    fireEvent.click(screen.getByRole('columnheader', { name: /Name/ }));

    expect(setSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('shows pagination above 20 rows', () => {
    render(<Table table={buildState(buildRows(21))} columns={COLUMNS} />);

    expect(screen.getByText('Seite 1 von 2')).toBeVisible();
  });

  it('shows the bulk bar after selecting a row', async () => {
    const onAction = vi.fn();
    render(
      <Table
        table={buildState(buildRows(2))}
        columns={COLUMNS}
        bulkActions={[{ key: 'delete', label: 'Auswahl löschen', onAction }]}
      />,
    );

    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Auswählen' })[0]!);
    expect(screen.getByText('1 Eintrag')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Auswahl löschen' }));

    expect(onAction).toHaveBeenCalledWith([{ id: 1, name: 'Zeile 1' }]);
  });
});
