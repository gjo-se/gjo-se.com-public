import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import SkillCurationView from '@src/features/fbf/skill/components/curation/SkillCurationView';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderFbf } from '../../../fbfTestUtils';

describe('SkillCurationView', () => {
  it('renders the loaded skills in the curation table', async () => {
    renderFbf(<SkillCurationView />, { route: '/admin/fbf/skill' });

    await vi.waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
    });
    expect(screen.getByText('Beschreibung')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
  });

  it('renders the load error instead of the table', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/skill`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    renderFbf(<SkillCurationView />, { route: '/admin/fbf/skill' });

    expect(
      await screen.findByText('Fehler: Fehler beim Laden der Daten.'),
    ).toBeInTheDocument();
  });

  it('renders the empty state without skills', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/skill`, () => HttpResponse.json([])),
      http.get(`${base}/admin/fbf/skill/count`, () => HttpResponse.json(0)),
    );

    renderFbf(<SkillCurationView />, { route: '/admin/fbf/skill' });

    expect(await screen.findByText('Keine Skills gefunden.')).toBeInTheDocument();
  });
});
