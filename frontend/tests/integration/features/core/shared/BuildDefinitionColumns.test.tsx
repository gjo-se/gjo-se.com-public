import { fireEvent, render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import { buildDefinitionColumns } from '@src/features/core/shared/BuildDefinitionColumns';
import { worker } from '@src/mocks/browser';

const typesHandler = http.get('/api/v1/admin/tagging/taggable-types', () =>
  HttpResponse.json(['project', 'skill']),
);

function buildColumns(renderUsage?: (row: Record<string, unknown>, count: number) => React.ReactNode) {
  return buildDefinitionColumns(
    { color_token: { label: 'Farbe' }, scope: { label: 'Scope' }, usage_count: { label: 'Nutzung' } },
    { update: vi.fn().mockResolvedValue(undefined), refreshData: vi.fn().mockResolvedValue(undefined), typeKind: 'taggable', renderUsage },
  );
}

function renderCell(element: React.ReactNode) {
  return render(
    <MantineProvider>
      <table><tbody><tr><td>{element}</td></tr></tbody></table>
    </MantineProvider>,
  );
}

describe('buildDefinitionColumns', () => {
  it('keeps the base columns and adds the three definition cells', () => {
    const columns = buildColumns();

    expect(columns.color_token.label).toBe('Farbe');
    expect(columns.scope.label).toBe('Scope');
    expect(columns.usage_count.label).toBe('Nutzung');
  });

  it('renders the color token cell for a row', () => {
    worker.use(typesHandler);
    const columns = buildColumns();

    renderCell(columns.color_token.renderCell?.({ id: 1, color_token: 'blue' }) as React.ReactElement);

    expect(screen.getByText(/· #/)).toBeInTheDocument();
  });

  it('renders the selected scope values', () => {
    worker.use(typesHandler);
    const columns = buildColumns();

    renderCell(columns.scope.renderCell?.({ id: 1, scope: ['project'] }) as React.ReactElement);

    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('shows the usage count with the default renderer', () => {
    const columns = buildColumns();

    renderCell(columns.usage_count.renderCell?.({ id: 1, usage_count: 4 }) as React.ReactElement);

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('delegates the usage cell to a custom renderer', () => {
    const columns = buildColumns((_row, count) => <span>benutzt: {count}</span>);

    renderCell(columns.usage_count.renderCell?.({ id: 1, usage_count: 0 }) as React.ReactElement);

    expect(screen.getByText('benutzt: 0')).toBeInTheDocument();
  });

  it('persists a new color token and refreshes the table', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const refreshData = vi.fn().mockResolvedValue(undefined);
    const columns = buildDefinitionColumns(
      { color_token: { label: 'Farbe' } },
      { update, refreshData, typeKind: 'taggable' },
    );

    renderCell(columns.color_token.renderCell?.({ id: 3, color_token: 'blue' }) as React.ReactElement);

    fireEvent.click(screen.getByText(/· #/));
    const swatches = await screen.findAllByRole('radio');
    fireEvent.click(swatches[0]);

    await vi.waitFor(() => expect(refreshData).toHaveBeenCalled());
  });
});
