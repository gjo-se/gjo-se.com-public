import { render, screen } from '@testing-library/react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TableRenderer from '@src/components/table/TableRenderer';
import { useTableColumns } from '@src/components/table/useTableColumns';

import type { TableColumnProps } from '@src/components/table/TableColumn.interface';
import type { TableRowActionsProps } from '@src/components/table/TableRowActions.interface';

interface Row {
  id: number;
  name: string;
  status: string;
}

const COLUMNS: Record<string, TableColumnProps> = {
  name: { label: 'Name' },
  status: { label: 'Status', renderCell: (row) => `Status: ${(row as unknown as Row).status}` },
};

function Harness({ rowActions, enableSelection = false }: {
  rowActions?: TableRowActionsProps<Row>[];
  enableSelection?: boolean;
}) {
  const columns = useTableColumns<Row>(COLUMNS, rowActions, enableSelection);
  const table = useReactTable({
    data: [{ id: 1, name: 'Alpha', status: 'aktiv' }],
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  });

  return <TableRenderer table={table} />;
}

describe('useTableColumns', () => {
  it('renders the declared columns and custom cells', () => {
    render(<Harness />);

    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Status: aktiv' })).toBeVisible();
  });

  it('renders a selection checkbox column when enabled', () => {
    render(<Harness enableSelection />);

    expect(screen.getByRole('checkbox', { name: 'Auswählen' })).toBeVisible();
  });

  it('renders the row actions', async () => {
    const onAction = vi.fn();
    render(<Harness rowActions={[{ key: 'export', label: 'Exportieren', onAction }]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }));

    expect(onAction).toHaveBeenCalledWith({ id: 1, name: 'Alpha', status: 'aktiv' });
  });
});
