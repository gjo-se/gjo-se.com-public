import { render, screen } from '@testing-library/react';
import { getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import TablePagination from '@src/components/table/TablePagination';

import type { ColumnDef } from '@tanstack/react-table';

interface Row {
  id: number;
  name: string;
}

const COLUMNS: ColumnDef<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
];

function buildRows(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: index + 1, name: `Zeile ${index + 1}` }));
}

function Harness({ rows, totalCount }: { rows: Row[]; totalCount?: number }) {
  const table = useReactTable({
    data: rows,
    columns: COLUMNS,
    getCoreRowModel: getCoreRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  });

  return <TablePagination table={table} totalCount={totalCount} />;
}

describe('TablePagination', () => {
  it('shows the page info and the entry count', () => {
    render(<Harness rows={buildRows(25)} />);

    expect(screen.getByText('Seite 1 von 3')).toBeVisible();
    expect(screen.getByText('25 Einträge')).toBeVisible();
  });

  it('disables the back button on the first page', () => {
    render(<Harness rows={buildRows(25)} />);

    expect(screen.getByRole('button', { name: '← Zurück' })).toBeDisabled();
  });

  it('moves to the next page', async () => {
    render(<Harness rows={buildRows(25)} />);

    await userEvent.click(screen.getByRole('button', { name: 'Weiter →' }));

    expect(screen.getByText('Seite 2 von 3')).toBeVisible();
  });

  it('uses the supplied total count', () => {
    render(<Harness rows={buildRows(5)} totalCount={42} />);

    expect(screen.getByText('42 Einträge')).toBeVisible();
  });

  it('uses the singular label for a single entry', () => {
    render(<Harness rows={buildRows(1)} />);

    expect(screen.getByText('1 Eintrag')).toBeVisible();
  });
});
