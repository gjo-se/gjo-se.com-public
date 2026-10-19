import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import AdrTable from '@src/features/viscera/adrs/components/adr/AdrTable';
import { worker } from '@src/mocks/browser';

import { renderWithWorkspace } from '../../../visceraTestUtils';

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
].join('\n');

describe('AdrTable', () => {
  it('loads and lists the adr files', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));

    renderWithWorkspace(<AdrTable />, { route: '/admin/viscera/adrs' });

    expect(await screen.findByText('Title')).toBeInTheDocument();
    expect((await screen.findAllByText('Architektur als Code')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Accepted').length).toBeGreaterThan(0);
  });

  it('shows the empty message when the status filter matches nothing', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));

    renderWithWorkspace(<AdrTable />, { route: '/admin/viscera/adrs?status=superseded' });

    await waitFor(() =>
      expect(
        screen.getByText('Keine ADRs gefunden. Erstelle eine neue unter architecture/adr/.'),
      ).toBeInTheDocument(),
    );
  });

  it('keeps the status filter dropdown available', async () => {
    worker.use(http.get('/architecture/adr/*.md', () => HttpResponse.text(ADR_MARKDOWN)));

    renderWithWorkspace(<AdrTable />, { route: '/admin/viscera/adrs' });

    expect(await screen.findByRole('button', { name: 'Status' })).toBeInTheDocument();
  });
});
