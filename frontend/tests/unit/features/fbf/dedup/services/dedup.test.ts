/**
 * Tests: dedup service (admin endpoints)
 *
 * Behaviour: each function targets the documented endpoint, sends only the
 * documented payload keys (optional keys omitted instead of sent as
 * undefined) and unwraps the axios response data. The HTTP client is doubled
 * at the `@src/lib/api/axios` boundary only.
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
  activateMaster,
  archiveSkills,
  assignSlave,
  bulkAction,
  dissolveGroup,
  fetchBoard,
  fetchSimilarMasters,
  fetchSuggestions,
  unassignSkills,
  updateSkillName,
} from '@src/features/fbf/dedup/services/dedup';

import type { BoardItem } from '@src/features/fbf/dedup/services/dedup';

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('dedup mutations', () => {
  it('aktiviert Master und Slaves am Aktivierungs-Endpoint', async () => {
    http.post.mockResolvedValue({ data: { updated: 3 } });

    const result = await activateMaster(5, [1, 2]);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/activate',
      { master_id: 5, slave_ids: [1, 2] },
    ]);
    expect(result).toEqual({ updated: 3 });
  });

  it('deprecated Skills über den Archiv-Endpoint', async () => {
    http.post.mockResolvedValue({ data: { updated: 2 } });

    await archiveSkills([1, 2]);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/archive',
      { skill_ids: [1, 2] },
    ]);
  });

  it('weist einen Slave einem Master zu', async () => {
    http.post.mockResolvedValue({ data: { updated: 1 } });

    await assignSlave(11, 5);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/assign',
      { skill_id: 11, master_id: 5 },
    ]);
  });

  it('sendet bei Bulk-Aktionen mit Master die master_id mit', async () => {
    http.post.mockResolvedValue({ data: { updated: 4 } });

    await bulkAction('assign', [1, 2], 5);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/bulk',
      { action: 'assign', skill_ids: [1, 2], master_id: 5 },
    ]);
  });

  it('lässt die master_id bei Bulk-Aktionen ohne Master weg', async () => {
    http.post.mockResolvedValue({ data: { updated: 1 } });

    await bulkAction('unassign', [3]);

    const body = http.post.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).toEqual({ action: 'unassign', skill_ids: [3] });
    expect(body).not.toHaveProperty('master_id');
  });

  it('löst eine Gruppe am Dissolve-Endpoint auf', async () => {
    http.post.mockResolvedValue({ data: { updated: 6 } });

    await dissolveGroup(5);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/dissolve',
      { master_id: 5 },
    ]);
  });

  it('hebt Zuordnungen am Unassign-Endpoint auf', async () => {
    http.post.mockResolvedValue({ data: { updated: 2 } });

    await unassignSkills([4, 6]);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/unassign',
      { skill_ids: [4, 6] },
    ]);
  });
});

describe('dedup reads', () => {
  it('lädt eine Board-Seite mit den übergebenen Parametern', async () => {
    const page = { items: [], total: 0, page: 1, size: 20, checked_masters: 0, total_masters: 0 };
    http.get.mockResolvedValue({ data: page });

    const result = await fetchBoard({ column: 'masters', page: 1, size: 20 });

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/board',
      { params: { column: 'masters', page: 1, size: 20 } },
    ]);
    expect(result).toEqual(page);
  });

  it('reicht alle Similar-Master-Filter weiter und gibt nur die Items zurück', async () => {
    http.post.mockResolvedValue({ data: { items: [{ id: 1 }] } });

    const result = await fetchSimilarMasters([1, 2], 'python', 'active', false);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/similar-masters',
      { skill_ids: [1, 2], q: 'python', status: 'active', has_slaves: false },
    ]);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('lässt leere Similar-Master-Filter vollständig weg', async () => {
    http.post.mockResolvedValue({ data: { items: [] } });

    await fetchSimilarMasters([1], '', undefined, undefined);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/similar-masters',
      { skill_ids: [1] },
    ]);
  });

  it('lädt Vorschläge für einen Slave', async () => {
    http.get.mockResolvedValue({ data: [{ id: 2 }] });

    const result = await fetchSuggestions(9);

    expect(http.get.mock.calls[0]).toEqual([
      '/admin/fbf/dedup/suggestions',
      { params: { slave_id: 9 } },
    ]);
    expect(result).toEqual([{ id: 2 }]);
  });
});

describe('updateSkillName', () => {
  it('sendet den vollständigen Skill-Body mit neuem Namen und erhält alle übrigen Felder', async () => {
    const item: BoardItem = {
      id: 7,
      name: 'Alt',
      description: null,
      status: 'active',
      canonical_id: 3,
      master_name: 'Master',
      alias_count: 0,
      importance: 4,
      level: 2,
      level_public: null,
    };
    http.put.mockResolvedValue({ data: { ...item, name: 'Neu' } });

    const result = await updateSkillName(item, 'Neu');

    expect(http.put.mock.calls[0]).toEqual([
      '/admin/fbf/skill/7',
      {
        name: 'Neu',
        importance: 4,
        level: 2,
        level_public: null,
        status: 'active',
        canonical_id: 3,
      },
    ]);
    expect(result).toEqual({ ...item, name: 'Neu' });
  });

  it('sendet fehlende Score- und Master-Felder als null', async () => {
    const item: BoardItem = {
      id: 8,
      name: 'Alt',
      description: null,
      status: 'pending',
      canonical_id: null,
      master_name: null,
      alias_count: 0,
      importance: null,
      level: null,
      level_public: null,
    };
    http.put.mockResolvedValue({ data: item });

    await updateSkillName(item, 'Neu');

    const body = http.put.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).toEqual({
      name: 'Neu',
      importance: null,
      level: null,
      level_public: null,
      status: 'pending',
      canonical_id: null,
    });
  });
});
