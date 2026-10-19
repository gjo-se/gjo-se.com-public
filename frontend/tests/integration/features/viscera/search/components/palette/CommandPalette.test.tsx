import { fireEvent, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import CommandPalette from '@src/features/viscera/search/components/palette/CommandPalette';
import { worker } from '@src/mocks/browser';

import { EMPTY_WORKSPACE, renderWithWorkspace } from '../../../visceraTestUtils';

import type { Workspace } from '@src/features/viscera/core/workspaceSchema';

const ADR_MARKDOWN = [
  '---',
  'id: 1',
  'title: Architektur als Code',
  'status: accepted',
  'date: "2026-01-01"',
  '---',
  '',
  '# Architektur als Code',
].join('\n');

const WORKSPACE: Workspace = {
  ...EMPTY_WORKSPACE,
  objects: [{ id: 'backend', name: 'Backend API', description: 'FastAPI', external: false }],
};

describe('CommandPalette', () => {
  it('shows the search prompt while the query is empty', () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));
    renderWithWorkspace(<CommandPalette open onClose={vi.fn()} />, { workspace: WORKSPACE });

    expect(
      screen.getByPlaceholderText('Systeme, Container, ADRs, Flows durchsuchen…'),
    ).toBeInTheDocument();
    expect(screen.getByText('Tippen zum Suchen…')).toBeInTheDocument();
  });

  it('finds a workspace object by fuzzy query', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));
    renderWithWorkspace(<CommandPalette open onClose={vi.fn()} />, { workspace: WORKSPACE });

    fireEvent.change(
      screen.getByPlaceholderText('Systeme, Container, ADRs, Flows durchsuchen…'),
      { target: { value: 'Backend' } },
    );

    expect(await screen.findByText('Backend API')).toBeInTheDocument();
    expect(screen.getByText('Systems')).toBeInTheDocument();
  });

  it('reports no matches for an unknown query', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));
    renderWithWorkspace(<CommandPalette open onClose={vi.fn()} />, { workspace: WORKSPACE });

    fireEvent.change(
      screen.getByPlaceholderText('Systeme, Container, ADRs, Flows durchsuchen…'),
      { target: { value: 'zzzzz' } },
    );

    expect(await screen.findByText('Keine Ergebnisse für "zzzzz"')).toBeInTheDocument();
  });
});
