import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import PortfolioSortableRow from '@src/features/portfolio/components/portfolio-admin-table/PortfolioSortableRow';

import { renderSortableRow } from '../../../integrationTestUtils';

import type { PortfolioAdminRow } from '@src/features/portfolio/hooks/usePortfolioAdminTable';

const ROW: PortfolioAdminRow = {
  id: 1,
  slug: 'fixture-project',
  title: 'Fixture-Projekt',
  sub_title: 'Beispiel',
  status: 'active',
  status_color_token: 'green',
};

describe('PortfolioSortableRow', () => {
  it('renders title and sub-title of the row', () => {
    renderSortableRow(ROW.slug, (
      <PortfolioSortableRow
        row={ROW}
        sortableEnabled
        onEdit={vi.fn()}
        onDelete={vi.fn(async () => null)}
      />
    ));

    expect(screen.getByText('Fixture-Projekt')).toBeInTheDocument();
    expect(screen.getByText('Beispiel')).toBeInTheDocument();
  });

  it('invokes the edit handler with the row', async () => {
    const onEdit = vi.fn();
    renderSortableRow(ROW.slug, (
      <PortfolioSortableRow
        row={ROW}
        sortableEnabled
        onEdit={onEdit}
        onDelete={vi.fn(async () => null)}
      />
    ));

    await userEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }));

    expect(onEdit).toHaveBeenCalledWith(ROW);
  });

  it('asks for confirmation before deleting the row', async () => {
    const onDelete = vi.fn(async () => null);
    renderSortableRow(ROW.slug, (
      <PortfolioSortableRow
        row={ROW}
        sortableEnabled
        onEdit={vi.fn()}
        onDelete={onDelete}
      />
    ));

    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Löschen bestätigen')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Löschen' }));

    expect(onDelete).toHaveBeenCalledWith('fixture-project');
  });
});
