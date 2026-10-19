import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import FocusAreaTable from '@src/features/application-profile/components/focus-area-table/FocusAreaTable';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

const FOCUS_AREAS = [
  {
    id: 1,
    applicationProfileId: 1,
    slug: 'ai',
    url: null,
    sort: 0,
    translations: { de: { title: 'KI', summary: 'Kurztext DE' } },
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 2,
    applicationProfileId: 1,
    slug: 'architecture',
    url: null,
    sort: 1,
    translations: { de: { title: 'Architektur', summary: null } },
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
  },
];

describe('FocusAreaTable', () => {
  it('loads and renders the focus areas', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/focus-areas`, () =>
        HttpResponse.json(FOCUS_AREAS),
      ),
    );

    renderWithProviders(<FocusAreaTable />);

    expect(await screen.findByText('KI')).toBeInTheDocument();
    expect(screen.getByText('Architektur')).toBeInTheDocument();
    expect(screen.getByText('2 Einträge')).toBeInTheDocument();
  });

  it('filters the rows client-side', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/focus-areas`, () =>
        HttpResponse.json(FOCUS_AREAS),
      ),
    );

    renderWithProviders(<FocusAreaTable />);
    expect(await screen.findByText('KI')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Suche nach Slug oder Titel…'), {
      target: { value: 'architektur' },
    });

    expect(screen.getByText('Architektur')).toBeInTheDocument();
    expect(screen.queryByText('KI')).not.toBeInTheDocument();
  });

  it('opens the ghost row via the toolbar action', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/focus-areas`, () =>
        HttpResponse.json(FOCUS_AREAS),
      ),
    );

    renderWithProviders(<FocusAreaTable />);
    expect(await screen.findByText('KI')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Neu (⌘+Enter)' }));

    expect(
      screen.getByPlaceholderText('ai | architecture | clean-code'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Titel DE (Pflicht)')).toBeInTheDocument();
  });

  it('validates the ghost row before creating a focus area', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/focus-areas`, () =>
        HttpResponse.json(FOCUS_AREAS),
      ),
    );

    renderWithProviders(<FocusAreaTable />);
    expect(await screen.findByText('KI')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Neu (⌘+Enter)' }));
    fireEvent.keyDown(
      screen.getByPlaceholderText('ai | architecture | clean-code'),
      { key: 'Enter' },
    );

    expect(await screen.findByText('Slug ist ein Pflichtfeld.')).toBeInTheDocument();
  });

  it('shows a load error instead of the table', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/focus-areas`, () =>
        HttpResponse.json({ detail: 'Hauptbereiche nicht verfügbar' }, { status: 500 }),
      ),
    );

    renderWithProviders(<FocusAreaTable />);

    expect(
      await screen.findByText(/Hauptbereiche nicht verfügbar/),
    ).toBeInTheDocument();
  });
});
