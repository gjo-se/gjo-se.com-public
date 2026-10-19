import { screen } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import SkillGroupAdminTab from '@src/features/fbf/skill/components/skill-group-admin-tab/SkillGroupAdminTab';
import { worker } from '@src/mocks/browser';
import { base } from '@src/mocks/handlers/shared';

import { renderFbf } from '../../../fbfTestUtils';

const GROUPS = [
  {
    id: 1,
    sort: 1,
    priority: 'high',
    labels: { de: 'Backend', en: 'Backend EN' },
    skill_count: 4,
  },
  {
    id: 2,
    sort: 2,
    priority: 'medium',
    labels: { de: 'Frontend', en: 'Frontend EN' },
    skill_count: 0,
  },
];

describe('SkillGroupAdminTab', () => {
  beforeEach(() => {
    worker.use(
      http.get(`${base}/admin/fbf/skill-group`, () => HttpResponse.json(GROUPS)),
    );
  });

  it('renders the loaded skill groups', async () => {
    renderFbf(<SkillGroupAdminTab />);

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a group', async () => {
    renderFbf(<SkillGroupAdminTab />);

    expect(await screen.findByText('Backend')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Löschen' }));

    expect(await screen.findByText('Skill-Gruppe löschen')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Diese Skill-Gruppe wird endgültig gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      ),
    ).toBeInTheDocument();
  });

  it('renders the empty state without groups', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/skill-group`, () => HttpResponse.json([])),
    );

    renderFbf(<SkillGroupAdminTab />);

    expect(
      await screen.findByText('Keine Skill-Gruppen vorhanden.'),
    ).toBeInTheDocument();
  });

  it('renders the load error', async () => {
    worker.use(
      http.get(`${base}/admin/fbf/skill-group`, () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    );

    renderFbf(<SkillGroupAdminTab />);

    expect(
      await screen.findByText('Fehler beim Laden der Skill-Gruppen.'),
    ).toBeInTheDocument();
  });
});
