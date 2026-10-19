import { render, screen } from '@testing-library/react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';

import TableRenderer from '@src/components/table/TableRenderer';

import type { ColumnDef } from '@tanstack/react-table';

interface Row {
  id: number;
  name: string;
}

const COLUMNS: ColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

function Harness({ rows, isLoading = false }: { rows: Row[]; isLoading?: boolean }) {
  const table = useReactTable({ data: rows, columns: COLUMNS, getCoreRowModel: getCoreRowModel() });

  return <TableRenderer table={table} isLoading={isLoading} emptyMessage="Nichts vorhanden." />;
}

describe('TableRenderer', () => {
  it('renders header and rows', () => {
    render(<Harness rows={[{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]} />);

    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Alpha' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Beta' })).toBeVisible();
  });

  it('shows the empty message without rows', () => {
    render(<Harness rows={[]} />);

    expect(screen.getByText('Nichts vorhanden.')).toBeVisible();
  });

  it('shows the loading state while the first load runs', () => {
    render(<Harness rows={[]} isLoading />);

    expect(screen.getByText('Laden…')).toBeVisible();
    expect(screen.queryByText('Nichts vorhanden.')).not.toBeInTheDocument();
  });

  it('keeps the rows visible when reloading with data', () => {
    render(<Harness rows={[{ id: 1, name: 'Alpha' }]} isLoading />);

    expect(screen.getByRole('cell', { name: 'Alpha' })).toBeVisible();
  });
});
