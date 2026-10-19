/**
 * Hook: useProjectTrends
 *
 * Data-Fetching + Range-Filter-Logik für ProjectTrendChart.
 * Liefert State + Actions, getrennt nach Verantwortung.
 */
import { useCallback,useEffect, useRef, useState } from 'react';

import { fetchProjects } from '@src/lib/api/aiscope';
import { type SearchTerm, fetchActiveSearchTerms } from '@src/lib/api/searchTerms';
import { getISOWeek } from '@src/lib/formatDate';
import { type TrendDataPoint } from '@src/utils/projectTrendUtils';


// ── Types ───────────────────────────────────────────────────────

export interface UseProjectTrendsActions {
  handleJobRoleChange: (value: string) => void
  handleWeeksChange: (weeks: number) => void
}

/** Loads project data, optionally filtered by portal and job role, and builds a weekly trend dataset for the chart. */
export interface UseProjectTrendsResult {
  state: UseProjectTrendsState
  actions: UseProjectTrendsActions
}

export interface UseProjectTrendsState {
  data: TrendDataPoint[]
  jobRoles: SearchTerm[]
  selectedJobRole: number | null
  selectedWeeks: number
  loading: boolean
  error: string | null
}

// ── Constants ───────────────────────────────────────────────────

export const rangeOptions = [
  { label: '1 Q', weeks: 13 },
  { label: '2 Q', weeks: 26 },
  { label: '1 J', weeks: 52 },
] as const;

function buildTrendByWeek(
  projects: { posted_at: string | null }[],
  numDays: number,
): TrendDataPoint[] {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(today.getDate() - numDays);
  cutoff.setHours(0, 0, 0, 0);

  const counts: Record<string, number> = {};
  const labels: Record<string, string> = {};
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const { year, week } = getISOWeek(d);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    if (!(key in counts)) {
      counts[key] = 0;
      labels[key] = `KW\u00a0${week}`;
    }
  }

  const cutoffStr = cutoff.toISOString().slice(0, 10);
  projects.forEach((p) => {
    if (!p.posted_at) return;
    const dayStr = p.posted_at.slice(0, 10);
    if (dayStr < cutoffStr) return;
    const { year, week } = getISOWeek(new Date(dayStr));
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    if (key in counts) counts[key] += 1;
  });

  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, count]) => ({ weekKey, label: labels[weekKey], count }));
}

/** Loads project data, optionally filtered by portal and job role, and builds a weekly trend dataset for the chart. */
export function useProjectTrends(
  portalFilter: number | null = null,
): UseProjectTrendsResult {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [jobRoles, setJobRoles] = useState<SearchTerm[]>([]);
  const [selectedJobRole, setSelectedJobRole] = useState<number | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState<number>(13);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (_portal: number | null, jobRole: number | null, weeks: number) => {
      setLoading(true);
      setError(null);
      try {
        const projects = await fetchProjects({
          search_term_id: jobRole ?? undefined,
          limit: 5000,
          offset: 0,
          include_archived: true,
        });
        setData(buildTrendByWeek(projects, weeks * 7));
      } catch {
        setError('Fehler beim Laden der Trend-Daten.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchActiveSearchTerms()
      .then(setJobRoles)
      .catch(() => undefined);
    void load(portalFilter, selectedJobRole, selectedWeeks);
  }, [load, portalFilter, selectedJobRole, selectedWeeks]);

  const handleJobRoleChange = useCallback(
    (value: string) => {
      const id = value ? Number(value) : null;
      setSelectedJobRole(id);
      void load(portalFilter, id, selectedWeeks);
    },
    [load, portalFilter, selectedWeeks],
  );

  const handleWeeksChange = useCallback(
    (weeks: number) => {
      setSelectedWeeks(weeks);
      void load(portalFilter, selectedJobRole, weeks);
    },
    [load, portalFilter, selectedJobRole],
  );

  return {
    state: {
      data,
      jobRoles,
      selectedJobRole,
      selectedWeeks,
      loading,
      error,
    },
    actions: {
      handleJobRoleChange,
      handleWeeksChange,
    },
  };
}
