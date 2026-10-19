import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SortableTable } from '@src/components/table/SortableTable';

interface Row {
  id: number;
  name: string;
}

const ITEMS: Row[] = [
  { id: 1, name: 'Erste' },
  { id: 2, name: 'Zweite' },
];

const COLUMNS = [{ key: 'name', label: 'Name' }];

function renderRow(row: Row) {
  return (
    <tr key={row.id}>
      <td>{row.name}</td>
    </tr>
  );
}

describe('SortableTable', () => {
  it('renders the label with the item count and the rows', () => {
    render(
      <SortableTable
        label="Gruppen"
        items={ITEMS}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        onReorder={vi.fn()}
        renderRow={renderRow}
        emptyText="Keine Einträge."
      />,
    );

    expect(screen.getByText('Gruppen (2)')).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Erste' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Zweite' })).toBeVisible();
  });

  it('shows the empty state', () => {
    render(
      <SortableTable
        items={[]}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        onReorder={vi.fn()}
        renderRow={renderRow}
        emptyText="Noch keine Einträge."
      />,
    );

    expect(screen.getByText('Noch keine Einträge.')).toBeVisible();
  });

  it('shows the loading placeholder', () => {
    render(
      <SortableTable
        items={[]}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        onReorder={vi.fn()}
        renderRow={renderRow}
        emptyText="Leer."
        loading
      />,
    );

    expect(screen.getByText('Laden…')).toBeVisible();
  });

  it('shows the error placeholder instead of the table', () => {
    render(
      <SortableTable
        items={ITEMS}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        onReorder={vi.fn()}
        renderRow={renderRow}
        emptyText="Leer."
        errorText="Laden fehlgeschlagen."
      />,
    );

    expect(screen.getByText('Laden fehlgeschlagen.')).toBeVisible();
    expect(screen.queryByRole('cell', { name: 'Erste' })).not.toBeInTheDocument();
  });

  it('renders the ghost row and its validation error', () => {
    render(
      <SortableTable
        items={[]}
        columns={COLUMNS}
        getRowId={(row) => row.id}
        onReorder={vi.fn()}
        renderRow={renderRow}
        emptyText="Leer."
        ghostOpen
        ghostRow={<tr><td>Neue Zeile</td></tr>}
        ghostError="Bitte Name angeben."
      />,
    );

    expect(screen.getByText('Neue Zeile')).toBeVisible();
    expect(screen.getByText('Bitte Name angeben.')).toBeVisible();
  });
});
