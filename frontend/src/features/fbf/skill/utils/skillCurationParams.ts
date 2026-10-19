/**
 * skillCurationParams – Static query-param registry and filter-param builder for
 * the FBF skill curation table.
 *
 * Pure module (no React/Hook dependency): table key, URL-param names, the
 * TableParamRegistry and the shared list/count filter-param mapping.
 */

import type { TableParamRegistry } from '@src/components/table/useTableUrlState';

export const TABLE_KEY = 'admin-skills';
export const STATUS_PARAM = 'status';
export const TAG_PARAM = 'tag';
export const MASTER_PARAM = 'master';
export const MIN_IMP_PARAM = 'minImp';
export const MIN_L1_PARAM = 'minL1';
export const MIN_L2_PARAM = 'minL2';
export const MIN_AVG_PARAM = 'minAvg';
export const GROUP_PARAM = 'group';

export const SKILL_REGISTRY: TableParamRegistry = {
  [STATUS_PARAM]: { default: 'active', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [TAG_PARAM]: { default: '', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [MASTER_PARAM]: { default: 'masters', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [MIN_IMP_PARAM]: { default: '', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [MIN_L1_PARAM]: { default: '', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [MIN_L2_PARAM]: { default: '', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [MIN_AVG_PARAM]: { default: '', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
  [GROUP_PARAM]: { default: '', serialize: (v: unknown): string | undefined => (v ? String(v) : undefined) },
};

/** Builds the shared skill filter params (empty values dropped) for list + count. */
export function skillFilterParams(
  search: string, status: string, tag: string, masterFilter: string,
  minImp: string, minL1: string, minL2: string, minAvg: string, group: string,
) {
  return {
    q: search || undefined,
    status: status || undefined,
    tag: tag || undefined,
    master_filter: masterFilter || undefined,
    min_importance: minImp || undefined,
    min_level: minL1 || undefined,
    min_level_public: minL2 || undefined,
    min_avg_project_importance: minAvg || undefined,
    group_id: group || undefined,
  };
}
