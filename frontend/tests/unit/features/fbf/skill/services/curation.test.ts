/**
 * Tests: skill curation service
 *
 * The service is the HTTP contract for the admin skill table: list/count
 * filter mapping, pagination defaults and the preserve-all-others PUT body
 * for every field update.
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
  confirmSkills,
  createSkill,
  fetchAdminSkills,
  fetchAdminSkillsCount,
  reorderSkills,
  updateSkillDescription,
  updateSkillGroup,
  updateSkillName,
  updateSkillScore,
} from '@src/features/fbf/skill/services/curation';

import type { SkillAdminOut } from '@src/features/fbf/skill/services/curation';

function makeSkill(overrides: Partial<SkillAdminOut> = {}): SkillAdminOut {
  return {
    id: 5,
    name: 'TypeScript',
    description: 'Sprache',
    importance: 4,
    level: 3,
    level_public: 2,
    group_id: 2,
    canonical_id: 9,
    status: 'active',
    tags: [],
    project_count: 7,
    ...overrides,
  };
}

function lastBody(): Record<string, unknown> {
  return http.put.mock.calls[0]?.[1] as Record<string, unknown>;
}

beforeEach(() => {
  Object.values(http).forEach((fn) => fn.mockReset());
});

describe('skill mutations', () => {
  it('bestätigt die IDs und gibt die Anzahl der Übergänge zurück', async () => {
    http.post.mockResolvedValue({ data: 3 });

    const result = await confirmSkills([1, 2]);

    expect(http.post.mock.calls[0]).toEqual(['/admin/fbf/skill/confirm', { ids: [1, 2] }]);
    expect(result).toBe(3);
  });

  it('legt einen Skill mit leeren Score-Feldern an', async () => {
    http.post.mockResolvedValue({ data: makeSkill() });

    await createSkill({ name: 'TypeScript' });

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/skill',
      {
        name: 'TypeScript',
        description: null,
        importance: null,
        level: null,
        level_public: null,
      },
    ]);
  });

  it('sortiert Gruppen-Skills neu und gibt die Anzahl zurück', async () => {
    http.post.mockResolvedValue({ data: 4 });

    const result = await reorderSkills(2, [7, 5, 9]);

    expect(http.post.mock.calls[0]).toEqual([
      '/admin/fbf/skill/reorder',
      { group_id: 2, ordered_ids: [7, 5, 9] },
    ]);
    expect(result).toBe(4);
  });
});

describe('fetchAdminSkills', () => {
  it('nutzt die Pagination-Defaults und lässt leere Filter weg', async () => {
    http.get.mockResolvedValue({ data: [] });

    await fetchAdminSkills();

    const { params } = http.get.mock.calls[0]?.[1] as { params: Record<string, unknown> };
    expect(http.get.mock.calls[0]?.[0]).toBe('/admin/fbf/skill');
    expect(params.offset).toBe(0);
    expect(params.limit).toBe(20);
    expect(params.q).toBeUndefined();
    expect(params.status).toBeUndefined();
    expect(params.sort_by).toBeUndefined();
  });

  it('reicht Suche, Filter, Sortierung und Pagination weiter', async () => {
    http.get.mockResolvedValue({ data: [makeSkill()] });

    const result = await fetchAdminSkills({
      q: 'type',
      status: 'pending',
      min_importance: '3',
      group_id: '2',
      offset: 10,
      limit: 5,
      sort_by: 'name',
      sort_order: 'desc',
    });

    const { params } = http.get.mock.calls[0]?.[1] as { params: Record<string, unknown> };
    expect(params).toMatchObject({
      q: 'type',
      status: 'pending',
      min_importance: '3',
      group_id: '2',
      offset: 10,
      limit: 5,
      sort_by: 'name',
      sort_order: 'desc',
    });
    expect(result).toHaveLength(1);
  });

  it('lädt den Count ohne Pagination-Parameter', async () => {
    http.get.mockResolvedValue({ data: 12 });

    const result = await fetchAdminSkillsCount({ q: 'type' });

    const { params } = http.get.mock.calls[0]?.[1] as { params: Record<string, unknown> };
    expect(http.get.mock.calls[0]?.[0]).toBe('/admin/fbf/skill/count');
    expect(params.q).toBe('type');
    expect(params).not.toHaveProperty('offset');
    expect(result).toBe(12);
  });

  it('reicht Transportfehler weiter', async () => {
    http.get.mockRejectedValue(new Error('503'));

    await expect(fetchAdminSkills()).rejects.toThrow('503');
  });
});

describe('field updates preserve all other fields', () => {
  it('aktualisiert nur die Beschreibung', async () => {
    const skill = makeSkill();
    http.put.mockResolvedValue({ data: skill });

    await updateSkillDescription(skill, null);

    expect(http.put.mock.calls[0]?.[0]).toBe('/admin/fbf/skill/5');
    expect(lastBody()).toEqual({
      name: 'TypeScript',
      description: null,
      importance: 4,
      level: 3,
      level_public: 2,
      status: 'active',
      canonical_id: 9,
      group_id: 2,
    });
  });

  it('aktualisiert nur die Gruppe', async () => {
    const skill = makeSkill();
    http.put.mockResolvedValue({ data: skill });

    await updateSkillGroup(skill, null);

    expect(lastBody().group_id).toBeNull();
    expect(lastBody().name).toBe('TypeScript');
    expect(lastBody().canonical_id).toBe(9);
  });

  it('aktualisiert nur den Namen und behält canonical_id', async () => {
    const skill = makeSkill();
    http.put.mockResolvedValue({ data: skill });

    await updateSkillName(skill, 'TS');

    expect(lastBody().name).toBe('TS');
    expect(lastBody().canonical_id).toBe(9);
    expect(lastBody().status).toBe('active');
  });

  it('aktualisiert ein einzelnes Score-Feld', async () => {
    const skill = makeSkill();
    http.put.mockResolvedValue({ data: skill });

    await updateSkillScore(skill, 'level_public', null);

    expect(lastBody().level_public).toBeNull();
    expect(lastBody().importance).toBe(4);
    expect(lastBody().level).toBe(3);
  });

  it('setzt fehlende optionale Felder im Body auf null', async () => {
    const sparse = makeSkill({
      description: undefined,
      importance: undefined,
      level: undefined,
      level_public: undefined,
      canonical_id: undefined,
      group_id: undefined,
    });
    http.put.mockResolvedValue({ data: sparse });

    await updateSkillName(sparse, 'Neu');

    expect(lastBody()).toEqual({
      name: 'Neu',
      description: null,
      importance: null,
      level: null,
      level_public: null,
      status: 'active',
      canonical_id: null,
      group_id: null,
    });
  });
});
