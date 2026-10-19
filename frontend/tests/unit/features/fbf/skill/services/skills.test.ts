/**
 * Tests: skill list service
 *
 * Endpoint targets and parameter forwarding for the admin list/count reads
 * and the public skill/group reads.
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

import {
  fetchAdminSkillCount,
  fetchAdminSkillList,
  fetchSkillGroups,
  fetchSkillList,
} from '@src/features/fbf/skill/services/skills';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('admin skill reads', () => {
  it('lädt den Count mit den übergebenen Parametern', async () => {
    http.get.mockResolvedValue({ data: 8 });

    const result = await fetchAdminSkillCount({ q: 'py', status: 'active' });

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/skill/count',
      { params: { q: 'py', status: 'active' } },
    ]);
    expect(result).toBe(8);
  });

  it('lädt den Count ohne Parameter', async () => {
    http.get.mockResolvedValue({ data: 0 });

    await fetchAdminSkillCount();

    expect(http.get.mock.calls[0]).toEqual(['/admin/fbf/skill/count', { params: {} }]);
  });

  it('lädt eine paginierte Skill-Liste', async () => {
    const skills = [{ id: 1, name: 'Python', tags: [], project_count: 0 }];
    http.get.mockResolvedValue({ data: skills });

    const result = await fetchAdminSkillList({ limit: 10, offset: 20, sort_by: 'name' });

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/skill',
      { params: { limit: 10, offset: 20, sort_by: 'name' } },
    ]);
    expect(result).toEqual(skills);
  });
});

describe('public skill reads', () => {
  it('lädt die Gruppen für das angeforderte Locale', async () => {
    const groups = [{ id: 1 }];
    http.get.mockResolvedValue({ data: groups });

    const result = await fetchSkillGroups('de');

    expect(http.get.mock.calls[0]).toEqual([
      '/public/fbf/skill-group',
      { params: { locale: 'de' } },
    ]);
    expect(result).toEqual(groups);
  });

  it('lädt die öffentlichen Skills mit den übergebenen Parametern', async () => {
    http.get.mockResolvedValue({ data: [] });

    await fetchSkillList({ group: 'backend', limit: 5, grouped_only: true });

    expect(http.get.mock.calls[0]).toEqual([
      '/public/fbf/skill',
      { params: { group: 'backend', limit: 5, grouped_only: true } },
    ]);
  });

  it('reicht Fehler weiter', async () => {
    http.get.mockRejectedValue(new Error('offline'));

    await expect(fetchSkillList()).rejects.toThrow('offline');
  });
});
