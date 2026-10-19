import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import TableBulkBar from '@src/components/table/TableBulkBar';

describe('TableBulkBar', () => {
  it('renders nothing without a selection', () => {
    const { container } = render(
      <TableBulkBar selectedRows={[]} bulkActions={[]} onClearSelection={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the action, the clear control and the selected count', () => {
    render(
      <TableBulkBar
        selectedRows={[{ id: 1 }, { id: 2 }]}
        bulkActions={[{ key: 'delete', label: 'Löschen', onAction: vi.fn() }]}
        onClearSelection={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Löschen' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeVisible();
    expect(screen.getByText('2 Einträge')).toBeVisible();
  });

  it('uses the singular label for one selected row', () => {
    render(
      <TableBulkBar selectedRows={[{ id: 1 }]} bulkActions={[]} onClearSelection={vi.fn()} />,
    );

    expect(screen.getByText('1 Eintrag')).toBeVisible();
  });

  it('passes the selected rows to the bulk action', async () => {
    const onAction = vi.fn();
    render(
      <TableBulkBar
        selectedRows={[{ id: 1 }, { id: 2 }]}
        bulkActions={[{ key: 'export', label: 'Exportieren', onAction }]}
        onClearSelection={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Exportieren' }));

    expect(onAction).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
  });

  it('clears the selection', async () => {
    const onClearSelection = vi.fn();
    render(
      <TableBulkBar selectedRows={[{ id: 1 }]} bulkActions={[]} onClearSelection={onClearSelection} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onClearSelection).toHaveBeenCalledOnce();
  });
});
