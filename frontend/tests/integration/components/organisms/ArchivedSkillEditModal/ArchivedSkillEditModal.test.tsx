import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';

import ArchivedSkillEditModal from '@src/components/organisms/ArchivedSkillEditModal/ArchivedSkillEditModal';
import { worker } from '@src/mocks/browser';

import type { SkillRadarItem } from '@src/components/molecules/SkillRadar/SkillRadar.types';

const skill: SkillRadarItem = {
  id: 5,
  name: 'Alte Technologie',
  effective_importance: 2,
  level: 1,
  status: 'deprecated',
};

describe('ArchivedSkillEditModal', () => {
  it('renders the skill name when open', () => {
    render(
      <ArchivedSkillEditModal skill={skill} open onOpenChange={vi.fn()} onSaved={vi.fn()} />,
    );

    expect(screen.getByText('Alte Technologie')).toBeVisible();
  });

  it('shows an empty hint when no master matches the query', async () => {
    render(
      <ArchivedSkillEditModal skill={skill} open onOpenChange={vi.fn()} onSaved={vi.fn()} />,
    );

    const input = await screen.findByPlaceholderText('Master-Skill suchen…');
    await userEvent.fill(input, 'Nichts');

    expect(await screen.findByText('Keine Skills gefunden')).toBeVisible();
  });

  it('assigns the selected master and reports the saved skill', async () => {
    worker.use(
      http.post('/api/v1/admin/fbf/dedup/similar-masters', () =>
        HttpResponse.json({
          items: [
            {
              id: 9,
              name: 'Neue Technologie',
              similarity: 0.92,
              best_member_name: null,
              best_member_similarity: null,
            },
          ],
        }),
      ),
      http.put('/api/v1/admin/fbf/skill/:id', () => HttpResponse.json(null)),
    );
    const onSaved = vi.fn();
    render(
      <ArchivedSkillEditModal skill={skill} open onOpenChange={vi.fn()} onSaved={onSaved} />,
    );

    const input = await screen.findByPlaceholderText('Master-Skill suchen…');
    await userEvent.fill(input, 'Neue');
    await userEvent.click(await screen.findByText('Neue Technologie'));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(5, 'confirmed', null, null), {
      timeout: 2000,
    });
  });

  it('offers the clear action after a master was selected', async () => {
    worker.use(
      http.post('/api/v1/admin/fbf/dedup/similar-masters', () =>
        HttpResponse.json({
          items: [
            {
              id: 9,
              name: 'Neue Technologie',
              similarity: 0.92,
              best_member_name: null,
              best_member_similarity: null,
            },
          ],
        }),
      ),
      http.put('/api/v1/admin/fbf/skill/:id', () => HttpResponse.json(null)),
    );
    render(
      <ArchivedSkillEditModal skill={skill} open onOpenChange={vi.fn()} onSaved={vi.fn()} />,
    );

    const input = await screen.findByPlaceholderText('Master-Skill suchen…');
    await userEvent.fill(input, 'Neue');
    await userEvent.click(await screen.findByText('Neue Technologie'));

    expect(
      await screen.findByRole('button', { name: 'Master-Zuordnung entfernen' }),
    ).toBeVisible();
  });
});
