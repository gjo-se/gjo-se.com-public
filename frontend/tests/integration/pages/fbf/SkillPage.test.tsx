import { screen, within } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillPage from '@src/pages/fbf/SkillPage';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderFbf } from '../../features/fbf/fbfTestUtils';

const SKILLS = [
  {
    id: 1,
    name: 'TypeScript',
    level_public: 4,
    importance: 4,
    group_id: 1,
    sort: 1,
    tags: [{ id: 1, name: 'site:public', slug: 'site-public' }],
  },
];

const GROUPS = [{ id: 1, sort: 1, priority: 'high', label: 'Backend' }];

describe('SkillPage', () => {
  beforeEach(() => {
    worker.use(
      http.get(`${base}/public/fbf/skill`, () => HttpResponse.json(SKILLS)),
      http.get(`${base}/public/fbf/skill-group`, () => HttpResponse.json(GROUPS)),
      http.get(`${base}/public/content/de`, () => HttpResponse.json({})),
    );
  });

  it('renders the skill groups with their skills', async () => {
    renderFbf(<SkillPage />, { route: '/skills' });

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backend' })).toBeInTheDocument();
    expect(screen.getByText('Gruppen im Detail')).toBeInTheDocument();
  });

  it('opens the radar lightbox from a group card', async () => {
    renderFbf(<SkillPage />, { route: '/skills' });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Backend: Radar öffnen' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Radar-Detailansicht' });
    expect(within(dialog).getByText('Backend')).toBeInTheDocument();
  });

  it('renders the empty state without skills', async () => {
    worker.use(
      http.get(`${base}/public/fbf/skill`, () => HttpResponse.json([])),
    );

    renderFbf(<SkillPage />, { route: '/skills' });

    expect(await screen.findByText('Keine Inhalte verfügbar.')).toBeInTheDocument();
  });
});
