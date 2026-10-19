import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import CareerEntryTable from '@src/features/application-profile/components/career-entry-table/CareerEntryTable';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

const CAREER = [
  {
    id: 1,
    position: 'Senior Developer',
    company: 'Example GmbH',
    projectUrl: null,
    startDate: '2024-01-01',
    endDate: null,
    sort: 0,
    status: null,
    status_color_token: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    translations: { de: { description: 'Beschreibung DE' } },
  },
  {
    id: 2,
    position: 'Architect',
    company: 'Other AG',
    projectUrl: null,
    startDate: '2022-01-01',
    endDate: '2023-01-01',
    sort: 1,
    status: null,
    status_color_token: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    translations: {},
  },
];

describe('CareerEntryTable', () => {
  it('loads and renders the career rows', async () => {
    worker.use(http.get(`${base}/admin/application-profile/career`, () => HttpResponse.json(CAREER)));

    renderWithProviders(<CareerEntryTable />);

    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('Architect')).toBeInTheDocument();
    expect(screen.getByText('2 Einträge')).toBeInTheDocument();
  });

  it('filters the rows client-side by position or company', async () => {
    worker.use(http.get(`${base}/admin/application-profile/career`, () => HttpResponse.json(CAREER)));

    renderWithProviders(<CareerEntryTable />);
    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Suche nach Position oder Firma…'), {
      target: { value: 'architect' },
    });

    expect(screen.getByText('Architect')).toBeInTheDocument();
    expect(screen.queryByText('Senior Developer')).not.toBeInTheDocument();
    expect(screen.getByText('Suche aktiv – Sortieren deaktiviert.')).toBeInTheDocument();
  });

  it('validates the ghost row before creating a career entry', async () => {
    worker.use(http.get(`${base}/admin/application-profile/career`, () => HttpResponse.json(CAREER)));

    renderWithProviders(<CareerEntryTable />);
    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(await screen.findByText('Position ist ein Pflichtfeld.')).toBeInTheDocument();
  });

  it('shows a load error instead of the table', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/career`, () =>
        HttpResponse.json({ detail: 'Karriere nicht verfügbar' }, { status: 500 }),
      ),
    );

    renderWithProviders(<CareerEntryTable />);

    expect(
      await screen.findByText(/Karriere nicht verfügbar/),
    ).toBeInTheDocument();
  });
});
