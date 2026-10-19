/**
 * Tests: buildSkillRows
 *
 * Maps API skills to curation rows: score formatting (one decimal, de-DE),
 * sort fallbacks (-1 for missing scores), first alphabetical tag for sorting,
 * active derivation and the tag cell with resolved colour tokens.
 */
import { describe, expect, it } from 'vitest';

import { buildSkillRows } from '@src/features/fbf/skill/utils/skillCuration';

import type { CoreTagOut } from '@src/lib/api/coreCatalog';
import type { SkillAdminOut } from '@src/features/fbf/skill/services/curation';
import type { ReactElement } from 'react';

function makeTag(name: string): CoreTagOut {
  return {
    id: name.length,
    name,
    slug: name.toLowerCase(),
    category: 'tech',
    color_token: 'blue',
    description: null,
    sort_order: 0,
    usage_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function makeSkillTag(name: string): SkillAdminOut['tags'][number] {
  return {
    id: name.length,
    name,
    slug: name.toLowerCase(),
    category: 'tech',
    color_token: 'ignored',
    sort_order: 0,
    usage_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function makeSkill(overrides: Partial<SkillAdminOut> = {}): SkillAdminOut {
  return {
    id: 1,
    name: 'TypeScript',
    description: 'Sprache',
    tags: [],
    project_count: 4,
    status: 'active',
    ...overrides,
  };
}

interface TagCellProps {
  tags: { tag_name: string; tag_color_token: string }[]
}

const coreTags: CoreTagOut[] = [
  { ...makeTag('python'), color_token: 'green' },
  { ...makeTag('react'), color_token: 'cyan' },
];

describe('buildSkillRows', () => {
  it('formatiert die durchschnittliche Projekt-Wichtigkeit mit einer Nachkommastelle', () => {
    const rows = buildSkillRows([makeSkill({ avg_project_importance: 2.46 })], coreTags);

    expect(rows[0]?.avg_project_importance).toBe('2,5');
    expect(rows[0]?.avg_project_importance_sort).toBe(2.46);
  });

  it('fällt bei fehlenden Scores auf null bzw. -1 zurück', () => {
    const rows = buildSkillRows([makeSkill()], coreTags);

    expect(rows[0]).toMatchObject({
      avg_project_importance: null,
      avg_project_importance_sort: -1,
      importance_sort: -1,
      level_sort: -1,
      level_public_sort: -1,
    });
  });

  it('übernimmt vorhandene Score-Werte für die Sortierung', () => {
    const rows = buildSkillRows(
      [makeSkill({ importance: 4, level: 2, level_public: 3 })],
      coreTags,
    );

    expect(rows[0]).toMatchObject({ importance_sort: 4, level_sort: 2, level_public_sort: 3 });
  });

  it('leitet active aus dem Status ab', () => {
    const rows = buildSkillRows(
      [makeSkill({ status: 'active' }), makeSkill({ id: 2, status: 'pending' })],
      coreTags,
    );

    expect(rows.map((row) => row.active)).toEqual([true, false]);
  });

  it('nutzt den alphabetisch ersten Tag-Namen für die Sortierung', () => {
    const rows = buildSkillRows([makeSkill({ tags: [makeSkillTag('react')] })], coreTags);

    expect(rows[0]?.tags_sort).toBe('react');
  });

  it('sortiert Tags unabhängig von der API-Reihenfolge und lässt ungetaggte leer', () => {
    const rows = buildSkillRows(
      [makeSkill({ tags: [makeSkillTag('react'), makeSkillTag('python')] }), makeSkill({ id: 2 })],
      coreTags,
    );

    expect(rows.map((row) => row.tags_sort)).toEqual(['python', '']);
  });

  it('löst Tag-Farben aus den Core-Tags auf und fällt auf gray zurück', () => {
    const rows = buildSkillRows(
      [makeSkill({ tags: [makeSkillTag('python'), makeSkillTag('unknown')] })],
      coreTags,
    );

    const cell = (rows[0]?.tags as ReactElement<TagCellProps>).props;

    expect(cell.tags).toEqual([
      { tag_name: 'python', tag_color_token: 'green' },
      { tag_name: 'unknown', tag_color_token: 'gray' },
    ]);
  });

  it('liefert eine leere Liste ohne Skills', () => {
    expect(buildSkillRows([], coreTags)).toEqual([]);
  });
});
