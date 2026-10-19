/**
 * Tests: fetchSkillById
 *
 * Targets the admin detail endpoint and passes the entity through.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@src/lib/api/axios', () => ({ default: http, api: http }));

import { fetchSkillById } from '@src/features/fbf/skill/services/getSkill';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('fetchSkillById', () => {
  it('lädt den Skill über den ID-spezifischen Endpoint', async () => {
    const skill = { id: 12, name: 'Rust', tags: [], project_count: 1 };
    http.get.mockResolvedValue({ data: skill });

    const result = await fetchSkillById(12);

    expect(http.get.mock.calls[0]).toEqual(['/admin/fbf/skill/12']);
    expect(result).toEqual(skill);
  });

  it('reicht einen 404 an den Aufrufer weiter', async () => {
    http.get.mockRejectedValue(new Error('404 not found'));

    await expect(fetchSkillById(99)).rejects.toThrow('404 not found');
  });
});
