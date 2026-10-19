/**
 * Hook: useProjectComparison
 *
 * Fetches the master normalised project and all its slave projects
 * (where canonical_id = master.id) to power the side-by-side comparison table.
 */
import { useEffect, useState } from 'react';

import {
  fetchProjectById,
  fetchProjectSlaves,
  streamDescriptionMerge,
  type CallLogMeta,
  type Project,
} from '@src/lib/api/aiscope';
import type { ComparisonColumn, SkillBadgeItem } from '@src/lib/api/aiscopeTypes';
import { showErrorToast } from '@src/lib/errorToast';
import { formatDateOnly } from '@src/lib/formatDate';
import { routeConfig } from '@src/router.config';


import {
  formatContractType,
  formatDuration,
  formatStartDate,
} from '../../../utils/projectFormatters';


import type { ProjectStatus } from '../core/types';

/** Column fields derived identically for master and slave projects. */
type CommonColumnFields = Pick<
  ComparisonColumn,
  | 'id'
  | 'title'
  | 'titleNormalized'
  | 'city'
  | 'country'
  | 'duration'
  | 'start'
  | 'remote'
  | 'remoteWarn'
  | 'jobRole'
  | 'contractType'
  | 'contractWarn'
  | 'postedAt'
  | 'postedAtWarn'
  | 'freelancermapId'
  | 'freelancermapUrl'
  | 'agency'
  | 'contactName'
  | 'description'
  | 'endcustomer'
  | 'industry'
>;

// ── Helpers (alphabetical) ───────────────────────────────────────────────────

export interface UseProjectComparisonResult {
  canonical: Project | null
  slaves: Project[]
  columns: ComparisonColumn[]
  loading: boolean
  error: string | null
  /** Current exclusive status of the master project (null before load). */
  status: ProjectStatus | null
  /** Whether the group's merged summary is stale (needs re-merge). */
  mergeDirty: boolean
  /** Whether a merge is currently running. */
  merging: boolean
  /** Live-streamed merge text while merging (null when not streaming). */
  streamingText: string | null
  /** Metadata of the most recent merge call (call_log_id). */
  callLogMeta: CallLogMeta | null
  /** Triggers an on-demand streamed merge of the whole group, then refetches. */
  runMerge: () => void
  /** Re-fetches all data (used after Switch Canonical / Unlink actions). */
  refetch: () => void
}

/** Builds the identity/display fields shared by master and slave columns. */
function buildCommonColumnFields(project: Project): CommonColumnFields {
  return {
    id: project.id,
    title: project.title,
    titleNormalized: project.title_normalized,
    city: project.city,
    country: project.country,
    duration: formatDuration(project.duration),
    start: formatStartDate(project.start_date),
    remote: project.remote_percent != null ? `${project.remote_percent} %` : '\u2013',
    remoteWarn: isLowRemote(project.remote_percent),
    jobRole: project.job_role_name ?? '\u2013',
    contractType: formatContractType(project.contract_type),
    contractWarn: isRedContractType(project.contract_type),
    postedAt: formatDateOnly(project.posted_at),
    postedAtWarn: isOlderThan30Days(project.posted_at),
    freelancermapId: project.freelancermap_id,
    freelancermapUrl: buildFreelancermapUrl(project.freelancermap_id),
    agency: project.company_name ?? '\u2013',
    contactName: project.contact_name ?? '\u2013',
    description: project.description,
    endcustomer: project.endcustomer === true ? 'Endkunde' : project.endcustomer === false ? 'Vermittler' : '\u2013',
    industry: project.industry ?? null,
  };
}

/**
 * Builds the raw-dataset detail URL from the raw ProjectFreelancerMap id.
 * Returns null when the project has no raw entry (link is hidden).
 */
function buildFreelancermapUrl(freelancermapId: number | null): string | null {
  if (freelancermapId == null) return null;
  return routeConfig.adminAiscopeFreelancermapDetail.path.replace(':id', String(freelancermapId));
}

function buildMasterColumn(project: Project): ComparisonColumn {
  return {
    ...buildCommonColumnFields(project),
    canonical: true,
    scoreLabel: 'Kanonisch',
    scoreChip: true,
    skills: toSkillBadgeItems(project),
    callLogId: project.last_merge_call_log_id,
    hourlyRate: project.hourly_rate,
    myHourlyRate: project.my_hourly_rate,
    myStartDate: project.my_start_date,
  };
}

function buildSlaveColumn(project: Project): ComparisonColumn {
  return {
    ...buildCommonColumnFields(project),
    canonical: false,
    scoreLabel:
      project.similarity_score != null
        ? `${Math.round(project.similarity_score * 100)} %`
        : '\u2013',
    scoreChip: false,
    skills: [],
    callLogId: null,
    hourlyRate: null,
    myHourlyRate: null,
    myStartDate: null,
  };
}

function isLowRemote(value: number | null | undefined): boolean {
  return value != null && value < 80;
}

/**
 * Derives whether the master's merged summary is stale.
 *
 * Dirty when never merged, or any group member was scraped after the last merge.
 */
function isMergeDirty(canonical: Project | null, slaves: Project[]): boolean {
  if (!canonical) return false;
  if (!canonical.merged_at) return true;
  const mergedAt = new Date(canonical.merged_at).getTime();
  const members = [canonical, ...slaves];
  return members.some(
    (m) => m.scraped_at != null && new Date(m.scraped_at).getTime() > mergedAt,
  );
}

function isOlderThan30Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) / 86_400_000 > 30;
}

function isRedContractType(value: string | null | undefined): boolean {
  return value === 'employee_leasing' || value === 'permanent_position';
}

/** Maps the API skill payload to the SkillBadges molecule item shape. */
function toSkillBadgeItems(project: Project): SkillBadgeItem[] {
  return project.skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    effective_importance: skill.effective_importance,
    level: skill.level,
    level_public: skill.level_public,
    status: skill.status,
  }));
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Fetches master project + all slave projects via canonical_id. */
export function useProjectComparison(
  id: string | undefined,
): UseProjectComparisonResult {
  const [canonical, setCanonical] = useState<Project | null>(null);
  const [slaves, setSlaves] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [merging, setMerging] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [callLogMeta, setCallLogMeta] = useState<CallLogMeta | null>(null);

  const refetch = () => {
    setLoading(true);
    setError(null);
    setRefetchTrigger((t) => t + 1);
  };

  const runMerge = () => {
    if (!canonical || merging) return;
    setMerging(true);
    setStreamingText('');
    setCallLogMeta(null);
    const prevSkillCount = canonical.skills.length;
    streamDescriptionMerge(canonical.id, (acc) => setStreamingText(acc))
      .then((result) => {
        if (result.callLogMeta) {
          setCallLogMeta(result.callLogMeta);
        }
        // Refetch to pick up merged_at (clears dirty); effect clears streamingText.
        setRefetchTrigger((t) => t + 1);

        // Pipeline (extract + backfill) runs async in the background.
        // Poll silently until skills appear, then trigger a full refetch.
        let attempts = 0;
        const poll = () => {
          attempts += 1;
          if (attempts > 15) return; // 30 s timeout
          setTimeout(async () => {
            try {
              const fresh = await fetchProjectById(Number(id));
              if (fresh.skills.length !== prevSkillCount) {
                setRefetchTrigger((t) => t + 1);
                return;
              }
            } catch {
              // Silently retry on transient errors.
            }
            poll();
          }, 2000);
        };
        poll();
      })
      .catch((err: unknown) => {
        showErrorToast(err instanceof Error ? err.message : 'Zusammenfassung fehlgeschlagen.');
        setStreamingText(null);
      })
      .finally(() => {
        setMerging(false);
      });
  };

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    fetchProjectById(Number(id))
      .then(async (project) => {
        if (cancelled) return;

        setCanonical(project);
        setStatus(project.status);
        // Fresh data loaded → drop any live-stream buffer so the persisted
        // merged_description_de is shown.
        setStreamingText(null);

        // Fetch slaves via dedicated endpoint
        const slaveProjects = await fetchProjectSlaves(project.id);
        if (cancelled) return;

        setSlaves(slaveProjects);
      })
      .catch(() => {
        if (!cancelled) setError('Projekt nicht gefunden.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refetchTrigger]);

  const columns: ComparisonColumn[] = [];
  if (canonical) {
    columns.push(buildMasterColumn(canonical));
  }
  slaves.forEach((slave) => {
    columns.push(buildSlaveColumn(slave));
  });

  const mergeDirty = isMergeDirty(canonical, slaves);

  return {
    canonical,
    slaves,
    columns,
    loading,
    error,
    status,
    mergeDirty,
    merging,
    streamingText,
    callLogMeta,
    runMerge,
    refetch,
  };
}
