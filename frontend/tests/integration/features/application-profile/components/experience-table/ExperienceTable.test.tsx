import { fireEvent, screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import ExperienceTable from '@src/features/application-profile/components/experience-table/ExperienceTable';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderWithProviders } from '../../../integrationTestUtils';

const EXPERIENCES = [
  {
    id: 1,
    applicationProfileId: 1,
    position: 'Senior Developer',
    company: 'Example GmbH',
    projectUrl: null,
    startDate: '2024-03-01',
    endDate: null,
    sort: 0,
    status: null,
    status_color_token: null,
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-01T08:00:00Z',
    translations: { de: { context: 'Kontext DE' } },
    decisions: [],
    proofs: [],
  },
];

describe('ExperienceTable', () => {
  it('loads and renders the experience projects', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/experience`, () =>
        HttpResponse.json(EXPERIENCES),
      ),
    );

    renderWithProviders(<ExperienceTable />);

    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();
    expect(screen.getByText('03/2024 – heute')).toBeInTheDocument();
  });

  it('shows the empty state without projects', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/experience`, () =>
        HttpResponse.json([]),
      ),
    );

    renderWithProviders(<ExperienceTable />);

    expect(await screen.findByText('Keine Projekte vorhanden.')).toBeInTheDocument();
  });

  it('opens the create overlay via the ghost action', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/experience`, () =>
        HttpResponse.json(EXPERIENCES),
      ),
    );

    renderWithProviders(<ExperienceTable />);
    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '＋ Neues Projekt (⌘+Enter)' }));

    expect(await screen.findByText('Neues Projekt')).toBeInTheDocument();
  });

  it('opens the create overlay via Cmd+Enter outside an input', async () => {
    worker.use(
      http.get(`${base}/admin/application-profile/experience`, () =>
        HttpResponse.json(EXPERIENCES),
      ),
    );

    renderWithProviders(<ExperienceTable />);
    expect(await screen.findByText('Senior Developer')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('table'), { key: 'Enter', metaKey: true });

    expect(await screen.findByText('Neues Projekt')).toBeInTheDocument();
  });
});
