/**
 * useProjectSiblings – Loads prev/next neighbours for the detail pager.
 *
 * Reconstructs the originating list query from the origin URL (Router-State
 * `from`, unified URL SSOT from Increment 5) and fetches the neighbour ids that
 * follow the exact same filter + sort order as the list. Returns `null` on a
 * side when the anchor is at the boundary of the result set.
 */

import { useEffect, useState } from 'react';

import { fetchProjectSiblings } from '@src/lib/api/aiscope';

import { DEFAULT_PROJECT_PRESET, PROJECT_PRESET_FILTERS } from '../core/types';

import type { ProjectPreset, ProjectStatus } from '../core/types';

// ── FE column key → backend sort field (mirrors useAdminProjects SORT_FIELD_MAP) ─
const SORT_FIELD_MAP: Record<string, string> = {
  id: 'id',
  title: 'title',
  city: 'city',
  remotePercent: 'remote_percent',
  contractType: 'contract_type',
  duration: 'duration',
  startDate: 'start_date',
  postedAt: 'posted_at',
  linkedCount: 'slave_count',
  jobRole: 'job_role',
  matchScore: 'match_score',
  confirmedScore: 'confirmed_score',
  endcustomer: 'endcustomer',
};

const DEFAULT_SORT_BY = 'posted_at';
const DEFAULT_SORT_ORDER: 'asc' | 'desc' = 'desc';

/** Backend query params reconstructed from the origin list URL. */
interface SiblingsQuery {
  q?: string
  search_term_id?: number
  sort_by: string
  sort_order: 'asc' | 'desc'
  from?: string
  to?: string
  status?: ProjectStatus
  include_archived: boolean
  min_score?: number
  merged?: boolean
  has_skills?: boolean
  endcustomer?: boolean
}

export interface UseProjectSiblingsResult {
  prevId: number | null
  nextId: number | null
  loading: boolean
}

/** Extracts the search string of an origin URL (returns '' when absent). */
function extractSearch(fromUrl: string | undefined): string {
  if (!fromUrl) return '';
  const queryStart = fromUrl.indexOf('?');
  return queryStart >= 0 ? fromUrl.slice(queryStart) : '';
}

/** Reconstructs the backend siblings query from the origin list URL. */
function reconstructQuery(fromUrl: string | undefined): SiblingsQuery {
  const params = new URLSearchParams(extractSearch(fromUrl));

  const sortKey = params.get('sort') ?? '';
  const sortBy = SORT_FIELD_MAP[sortKey] ?? DEFAULT_SORT_BY;
  const sortOrder = params.get('order') === 'asc' ? 'asc' : DEFAULT_SORT_ORDER;

  const presetRaw = params.get('preset') as ProjectPreset | null;
  const presetFilter = presetRaw && PROJECT_PRESET_FILTERS[presetRaw]
    ? PROJECT_PRESET_FILTERS[presetRaw]
    : PROJECT_PRESET_FILTERS[DEFAULT_PROJECT_PRESET];

  const jobRoleRaw = params.get('search_term_id');
  const fromDate = params.get('from') || undefined;
  const toRaw = params.get('to') || undefined;
  // Mirror the list: a lone `from` without `to` is treated as a single-day range.
  const toDate = fromDate && !toRaw ? fromDate : toRaw;
  const minScoreRaw = params.get('min_score');
  const mergedRaw = params.get('merged');
  const hasSkillsRaw = params.get('has_skills');
  const endcustomerRaw = params.get('endcustomer');

  return {
    q: params.get('q') || undefined,
    search_term_id: jobRoleRaw ? Number(jobRoleRaw) : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    from: fromDate,
    to: toDate,
    status: presetFilter.status,
    include_archived: presetFilter.include_archived,
    min_score: minScoreRaw ? Number(minScoreRaw) : undefined,
    merged: mergedRaw === 'true' ? true : mergedRaw === 'false' ? false : undefined,
    has_skills: hasSkillsRaw === 'true' ? true : hasSkillsRaw === 'false' ? false : undefined,
    endcustomer: endcustomerRaw === 'true' ? true : endcustomerRaw === 'false' ? false : undefined,
  };
}

/** Loads prev/next neighbour ids for the project detail pager. */
export function useProjectSiblings(
  id: string | undefined,
  fromUrl: string | undefined,
): UseProjectSiblingsResult {
  const [prevId, setPrevId] = useState<number | null>(null);
  const [nextId, setNextId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetchProjectSiblings(Number(id), reconstructQuery(fromUrl))
      .then((siblings) => {
        if (cancelled) return;
        setPrevId(siblings.prev_id);
        setNextId(siblings.next_id);
      })
      .catch(() => {
        if (cancelled) return;
        // Fail closed: no neighbours → both pager arrows disabled.
        setPrevId(null);
        setNextId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, fromUrl]);

  return { prevId, nextId, loading };
}
