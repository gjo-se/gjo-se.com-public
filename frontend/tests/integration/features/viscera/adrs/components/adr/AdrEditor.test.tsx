import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { WorkspaceContext } from '@src/features/viscera/core/useWorkspace';
import AdrEditor from '@src/features/viscera/adrs/components/adr/AdrEditor';
import { worker } from '@src/mocks/browser';

import { EMPTY_WORKSPACE, createWorkspaceValue } from '../../../visceraTestUtils';

const ADR_MARKDOWN = [
  '---',
  'id: 1',
  'title: Architektur als Code',
  'status: accepted',
  'date: "2026-01-01"',
  'systems: [backend]',
  '---',
  '',
  '# Architektur als Code',
  '',
  'Alle Architektur liegt im Repository.',
].join('\n');

function renderEditor(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/viscera/adrs/${id}`]}>
      <WorkspaceContext.Provider value={createWorkspaceValue(EMPTY_WORKSPACE)}>
        <Routes>
          <Route path="/admin/viscera/adrs/:id" element={<AdrEditor />} />
        </Routes>
      </WorkspaceContext.Provider>
    </MemoryRouter>,
  );
}

describe('AdrEditor', () => {
  it('shows the not-found hint for an unknown adr id', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));

    renderEditor('9999');

    expect(await screen.findByText('ADR "9999" nicht gefunden.')).toBeInTheDocument();
  });

  it('renders navigation, metadata and the split editor for a known adr', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));

    renderEditor('0001');

    expect(await screen.findByRole('link', { name: /Zurück zur Liste/ })).toBeInTheDocument();
    expect(await screen.findByText(/^0001 \/ \d{4}$/)).toBeInTheDocument();
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Architektur als Code' })).toBeInTheDocument();
  });

  it('offers no previous navigation for the first adr', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));

    renderEditor('0001');

    expect(await screen.findByRole('button', { name: 'Vorherige ADR' })).toBeDisabled();
  });
});
