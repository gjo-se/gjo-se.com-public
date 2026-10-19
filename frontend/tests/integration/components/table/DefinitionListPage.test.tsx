import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DefinitionListPage } from '@src/components/table/DefinitionListPage';
import { buildTableState } from '@src/components/table/buildTableState';

import type { DefinitionListPageProps } from '@src/components/table/DefinitionListPage';
import type { TableColumnProps } from '@src/components/table/TableColumn.interface';

interface Row {
  id: number;
  name: string;
}

const COLUMNS: Record<string, TableColumnProps> = { name: { label: 'Name' } };

const TABLE = buildTableState<Row>({
  data: [],
  total: 0,
  q: '',
  page: 0,
  size: 20,
  sort: '',
  order: 'desc',
  tableKey: 'definition-list-page-test',
  setQ: vi.fn(),
  setPage: vi.fn(),
  setSize: vi.fn(),
  setSort: vi.fn(),
  handleSearchChange: vi.fn(),
  resetUrlState: vi.fn(),
});

function renderPage(overrides: Partial<DefinitionListPageProps<Row>> = {}) {
  return render(
    <DefinitionListPage<Row>
      title="Tags"
      table={TABLE}
      columns={COLUMNS}
      rowActions={[]}
      loading={false}
      error={null}
      onGhostCreate={vi.fn().mockResolvedValue(undefined)}
      emptyMessage="Keine Tags."
      categoryFilter=""
      categoryOptions={[{ value: 'all', label: 'Alle' }]}
      onCategoryFilterChange={vi.fn()}
      {...overrides}
    />,
  );
}

describe('DefinitionListPage', () => {
  it('renders the page title and the empty table state', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Tags', level: 1 })).toBeVisible();
    expect(screen.getByText('Keine Tags.')).toBeVisible();
  });

  it('renders the category filter', () => {
    renderPage();

    expect(screen.getByRole('combobox')).toBeVisible();
  });

  it('renders the error state instead of the table', () => {
    renderPage({ error: 'Backend nicht erreichbar' });

    expect(screen.getByText('Fehler: Backend nicht erreichbar')).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders the optional child slot', () => {
    renderPage({ children: <div>Verwendung</div> });

    expect(screen.getByText('Verwendung')).toBeVisible();
  });
});
