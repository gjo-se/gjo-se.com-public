import { fireEvent, render, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { MantineProvider } from '@src/providers/mantine/MantineProvider';
import ScopeCell from '@src/features/core/shared/ScopeCell';
import { worker } from '@src/mocks/browser';

const typesHandler = http.get('/api/v1/admin/tagging/taggable-types', () =>
  HttpResponse.json(['project', 'skill']),
);

function renderCell(value: string[], onSave = vi.fn()) {
  return render(
    <MantineProvider>
      <ScopeCell value={value} onSave={onSave} typeKind="taggable" />
    </MantineProvider>,
  );
}

describe('ScopeCell', () => {
  it('renders the selected entity types as chips', () => {
    worker.use(typesHandler);
    renderCell(['project']);

    expect(screen.getByText('project')).toBeInTheDocument();
  });

  it('shows the placeholder when nothing is selected', () => {
    worker.use(typesHandler);
    renderCell([]);

    expect(screen.getByPlaceholderText('Entity-Typen…')).toBeInTheDocument();
  });

  it('saves an additionally selected entity type', async () => {
    worker.use(typesHandler);
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderCell(['project'], onSave);

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await screen.findByText('skill'));

    expect(onSave).toHaveBeenCalledWith(['project', 'skill']);
  });

  it('shows the empty hint when the type list cannot be loaded', async () => {
    worker.use(
      http.get('/api/v1/admin/tagging/taggable-types', () =>
        HttpResponse.json(null, { status: 500 }),
      ),
    );
    renderCell([]);

    fireEvent.click(screen.getByRole('combobox'));

    expect(await screen.findByText('Keine Typen')).toBeInTheDocument();
  });
});
