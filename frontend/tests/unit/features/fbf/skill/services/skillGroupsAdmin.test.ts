/**
 * Tests: skill group admin service
 *
 * CRUD contract for the curated skill groups: endpoint, method and payload.
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
  createSkillGroup,
  deleteSkillGroup,
  fetchAdminSkillGroups,
  reorderSkillGroups,
  updateSkillGroup,
} from '@src/features/fbf/skill/services/skillGroupsAdmin';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('skill group admin service', () => {
  it('legt eine Gruppe mit Labels und Priorität an', async () => {
    const created = { id: 1, sort: 0, priority: 'high', labels: { de: 'Backend' }, skill_count: 0 };
    http.post.mockResolvedValue({ data: created });

    const result = await createSkillGroup({ labels: { de: 'Backend' }, priority: 'high' });

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/skill-group',
      { labels: { de: 'Backend' }, priority: 'high' },
    ]);
    expect(result).toEqual(created);
  });

  it('löscht eine Gruppe über ihre ID', async () => {
    http.delete.mockResolvedValue({ status: 204 });

    const result = await deleteSkillGroup(4);

    expect(http.delete.mock.calls[0]).toEqual(['/admin/fbf/skill-group/4']);
    expect(result).toEqual({ status: 204 });
  });

  it('lädt alle Admin-Gruppen', async () => {
    const groups = [{ id: 1 }];
    http.get.mockResolvedValue({ data: groups });

    const result = await fetchAdminSkillGroups();

    expect(http.get.mock.calls[0]).toEqual(['/admin/fbf/skill-group']);
    expect(result).toEqual(groups);
  });

  it('sortiert Gruppen neu und gibt die Anzahl zurück', async () => {
    http.post.mockResolvedValue({ data: 3 });

    const result = await reorderSkillGroups([3, 1, 2]);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/skill-group/reorder',
      { ordered_ids: [3, 1, 2] },
    ]);
    expect(result).toBe(3);
  });

  it('aktualisiert Sortierung und Labels einer Gruppe', async () => {
    const updated = { id: 1, sort: 2, priority: 'base', labels: { de: 'Neu' }, skill_count: 1 };
    http.put.mockResolvedValue({ data: updated });

    const result = await updateSkillGroup(1, { sort: 2, labels: { de: 'Neu' } });

    expect(http.put.mock.calls[0]).toEqual([
      '/admin/fbf/skill-group/1',
      { sort: 2, labels: { de: 'Neu' } },
    ]);
    expect(result).toEqual(updated);
  });

  it('reicht den 409 beim Löschen einer belegten Gruppe weiter', async () => {
    http.delete.mockRejectedValue(new Error('409 skills assigned'));

    await expect(deleteSkillGroup(4)).rejects.toThrow('409 skills assigned');
  });
});
