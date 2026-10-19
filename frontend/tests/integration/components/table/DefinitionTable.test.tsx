import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import DefinitionTable from '@src/components/table/DefinitionTable';

import type { DefinitionTableProps } from '@src/components/table/DefinitionTable';

interface Row {
  value: number;
  label: string;
  description: string;
}

const ROWS: Row[] = [
  { value: 1, label: 'Hoch', description: 'Hohe Wichtigkeit' },
  { value: 2, label: 'Mittel', description: 'Mittlere Wichtigkeit' },
];

function renderTable(overrides: Partial<DefinitionTableProps<Row>> = {}) {
  return render(
    <DefinitionTable<Row>
      tableKey="definition-table-test"
      load={() => Promise.resolve(ROWS)}
      update={vi.fn().mockResolvedValue(undefined)}
      getValue={(row) => row.value}
      valueField="value"
      valueColumnLabel="Wert"
      loadErrorMessage="Laden fehlgeschlagen."
      saveErrorMessage="Speichern fehlgeschlagen."
      emptyMessage="Keine Definitionen."
      {...overrides}
    />,
  );
}

describe('DefinitionTable', () => {
  it('loads and renders the definition rows', async () => {
    renderTable();

    expect(await screen.findByRole('cell', { name: 'Hoch' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Mittel' })).toBeVisible();
  });

  it('shows the load error when loading fails', async () => {
    renderTable({ load: () => Promise.reject(new Error('boom')) });

    expect(await screen.findByText('Laden fehlgeschlagen.')).toBeVisible();
  });

  it('persists an edited label', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    renderTable({ update });

    const label = await screen.findByRole('button', { name: 'Hoch' });
    await userEvent.click(label);
    const input = screen.getByDisplayValue('Hoch');
    await userEvent.fill(input, 'Sehr hoch');
    await userEvent.keyboard('{Enter}');

    await waitFor(() => expect(update).toHaveBeenCalledWith(1, { label: 'Sehr hoch' }));
  });

  it('ignores an empty label input', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    renderTable({ update });

    const label = await screen.findByRole('button', { name: 'Hoch' });
    await userEvent.click(label);
    await userEvent.clear(screen.getByDisplayValue('Hoch'));
    await userEvent.keyboard('{Enter}');

    expect(update).not.toHaveBeenCalled();
  });
});
