import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import PortfolioAdminTable from '@src/features/portfolio/components/portfolio-admin-table/PortfolioAdminTable';

import type { PortfolioAdminRow } from '@src/features/portfolio/hooks/usePortfolioAdminTable';

const ROWS: PortfolioAdminRow[] = [
  { id: 1, slug: 'fixture-project', title: 'Fixture-Projekt', sub_title: 'Beispiel' },
  { id: 2, slug: 'second-project', title: 'Zweites Projekt', sub_title: 'Noch eins' },
];

/** Stateful harness mirroring the parent that owns the search value. */
function TableHarness({
  onGhostCreate = vi.fn(async () => null),
  rows = ROWS,
  error = null,
}: {
  onGhostCreate?: (data: Record<string, string>) => Promise<string | null>
  rows?: PortfolioAdminRow[]
  error?: string | null
}) {
  const [search, setSearch] = useState('');
  return (
    <PortfolioAdminTable
      portfolios={rows}
      isLoading={false}
      error={error}
      search={search}
      onSearchChange={setSearch}
      handleReorder={vi.fn(async () => null)}
      handleDelete={vi.fn(async () => null)}
      handleEdit={vi.fn()}
      onGhostCreate={onGhostCreate}
    />
  );
}

describe('PortfolioAdminTable', () => {
  it('renders the loaded projects with their titles and sub-titles', () => {
    render(<TableHarness />);

    expect(screen.getByText('Fixture-Projekt')).toBeInTheDocument();
    expect(screen.getByText('Beispiel')).toBeInTheDocument();
    expect(screen.getByText('2 Einträge')).toBeInTheDocument();
    expect(screen.getByText('Zum Sortieren Zeilen ziehen.')).toBeInTheDocument();
  });

  it('disables the sort hint while a search filter is active', async () => {
    render(<TableHarness />);

    await userEvent.type(
      screen.getByPlaceholderText('Suche nach Slug oder Titel…'),
      'fixture',
    );

    expect(screen.getByText('Suche aktiv – Sortieren deaktiviert.')).toBeInTheDocument();
  });

  it('opens the ghost row and creates a project with the typed slug', async () => {
    const onGhostCreate = vi.fn(async () => null);
    render(<TableHarness onGhostCreate={onGhostCreate} />);

    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await userEvent.type(await screen.findByPlaceholderText('Slug *'), 'neues-projekt');
    await userEvent.keyboard('{Enter}');

    expect(onGhostCreate).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'neues-projekt',
    }));
  });

  it('renders the empty state for an empty list', () => {
    render(<TableHarness rows={[]} />);

    expect(screen.getByText('Keine Projekte vorhanden.')).toBeInTheDocument();
  });

  it('renders the load error instead of the table', () => {
    render(<TableHarness error="Projekte konnten nicht geladen werden." />);

    expect(
      screen.getByText('Projekte konnten nicht geladen werden.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Fixture-Projekt')).not.toBeInTheDocument();
  });
});
