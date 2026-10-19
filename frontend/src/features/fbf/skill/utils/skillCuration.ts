/**
 * useSkillCuration.logic – Pure row builders for the skill curation table.
 *
 * Maps API skills to table rows. The ``active`` field drives the row-action
 * confirmed-toggle icon (green check = confirmed). Score columns (importance,
 * level, level_public) are rendered via renderCell in the hook, not here.
 * Uses createElement (no JSX in a .logic.ts file).
 */

import { createElement } from 'react';

import type { CoreTagOut } from '@src/lib/api/coreCatalog';

import TagCell from '../components/data-table/TagCell';
import { type SkillAdminOut } from '../services/curation';

import type { ReactNode } from 'react';

export interface SkillCurationRow {
  id: number
  name: string
  description: string | null
  group: number | null
  /** Raw project count (for server-side sorting). */
  project_count: number
  /** Percentage of total projects referencing this skill (0–100, one decimal). */
  project_percentage: number | null
  /** Average project_skill.importance (0–5, one decimal). Read-only. */
  avg_project_importance: string | null
  /** Raw numeric value for sorting avg_project_importance (nulls sort as -1). */
  avg_project_importance_sort: number
  /** Raw numeric values for sorting the score columns (nulls sort as -1). */
  importance_sort: number
  level_sort: number
  level_public_sort: number
  /** Alphabetically first tag name for sorting the tags column ('' = untagged, sorts first). */
  tags_sort: string
  /** True = confirmed (drives the green confirmed-toggle icon). */
  active: boolean
  tags: ReactNode
}

/** Maps API skills to curation table rows. Resolves tag color_tokens from core tags. */
export function buildSkillRows(
  skills: SkillAdminOut[],
  allCoreTags: CoreTagOut[],
): SkillCurationRow[] {
  const colorMap = new Map(allCoreTags.map((t) => [t.name, t.color_token]));

  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description ?? null,
    group: skill.group_id ?? null,
    project_count: skill.project_count ?? 0,
    project_percentage: skill.project_percentage != null ? skill.project_percentage : null,
    avg_project_importance: skill.avg_project_importance != null
      ? skill.avg_project_importance.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : null,
    avg_project_importance_sort: skill.avg_project_importance ?? -1,
    importance_sort: skill.importance ?? -1,
    level_sort: skill.level ?? -1,
    level_public_sort: skill.level_public ?? -1,
    tags_sort: [...(skill.tags ?? [])].map((t) => t.name).sort()[0] ?? '',
    active: skill.status === 'active',
    tags: createElement(TagCell, {
      tags: (skill.tags ?? []).map((t) => ({
        tag_name: t.name,
        tag_color_token: colorMap.get(t.name) ?? 'gray',
      })),
    }),
  }));
}
