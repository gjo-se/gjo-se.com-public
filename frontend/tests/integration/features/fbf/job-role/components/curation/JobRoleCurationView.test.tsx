import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import JobRoleCurationView from '@src/features/fbf/job-role/components/curation/JobRoleCurationView';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderFbf } from '../../../fbfTestUtils';

describe('JobRoleCurationView', () => {
  it('renders the loaded job roles in the curation table', async () => {
    renderFbf(<JobRoleCurationView />, { route: '/admin/fbf/job-role' });

    expect(await screen.findByText('Fullstack Developer')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders the load error instead of the table', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/job-role`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    renderFbf(<JobRoleCurationView />, { route: '/admin/fbf/job-role' });

    expect(
      await screen.findByText('Fehler: Fehler beim Laden der Job-Rollen.'),
    ).toBeInTheDocument();
  });

  it('renders the empty state when no job roles exist', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/job-role`, () => HttpResponse.json([])),
    );

    renderFbf(<JobRoleCurationView />, { route: '/admin/fbf/job-role' });

    expect(
      await screen.findByText('Keine Job-Rollen gefunden.'),
    ).toBeInTheDocument();
  });
});
