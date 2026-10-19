import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { fetchSimilarMasters, updateSkill } from '@src/lib/api/aiscopeSkills';
import { worker } from '@src/mocks/browser';

describe('aiscopeSkills', () => {
  it('posts the skill id and unwraps the similar master items', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/fbf/dedup/similar-masters', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          items: [
            {
              id: 3,
              name: 'TypeScript',
              similarity: 0.93,
              best_member_name: 'TS',
              best_member_similarity: 0.88,
            },
          ],
        });
      }),
    );

    const masters = await fetchSimilarMasters(4);

    expect(receivedBody).toEqual({ skill_ids: [4], status: 'confirmed' });
    expect(masters).toHaveLength(1);
    expect(masters[0].name).toBe('TypeScript');
  });

  it('updates a skill through its put endpoint', async () => {
    let receivedBody: unknown;
    let updatedId = '';
    worker.use(
      http.put('/api/v1/admin/fbf/skill/:id', async ({ request, params }) => {
        receivedBody = await request.json();
        updatedId = String(params.id);
        return HttpResponse.json({ id: 4, name: 'TypeScript' });
      }),
    );

    await updateSkill(4, { level: 5, level_public: 4 });

    expect(updatedId).toBe('4');
    expect(receivedBody).toEqual({ level: 5, level_public: 4 });
  });

  it('surfaces a rejected skill update as an error', async () => {
    worker.use(
      http.put('/api/v1/admin/fbf/skill/:id', () =>
        HttpResponse.json({ detail: 'Skill ungültig' }, { status: 422 }),
      ),
    );

    await expect(updateSkill(4, { level: 9 })).rejects.toThrow('422');
  });
});
