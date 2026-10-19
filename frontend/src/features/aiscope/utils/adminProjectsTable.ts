/**
 * Table wiring for the AdminProjects table: backend sort mapping, URL param
 * registry and the shared table key. Pure data + parsers (no React).
 */
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';

// ── Column key → backend sort field mapping ──────────────────────────────

export const SORT_FIELD_MAP: Record<string, string> = {
  id: 'id',
  title: 'title',
  city: 'city',
  remotePercent: 'remote_percent',
  contractType: 'contract_type',
  duration: 'duration',
  startDate: 'start_date',
  postedAt: 'posted_at',
  linkedCount: 'slave_count',
  jobRole: 'job_role_name',
  matchScore: 'match_score',
  confirmedScore: 'confirmed_score',
  endcustomer: 'endcustomer',
  hourlyRate: 'hourly_rate',
};

/** URL param name for the job role filter (registry-owned via useTableUrlState). */
export const JOB_ROLE_PARAM = 'search_term_id';

/** URL param name for the match-score threshold filter (registry-owned). */
export const MIN_SCORE_PARAM = 'min_score';

/** URL param name for the endcustomer filter (registry-owned). */
export const ENDCUSTOMER_PARAM = 'endcustomer';

/** URL param name for the "not merged" filter (registry-owned). */
export const MERGED_PARAM = 'merged';

/** URL param name for the "no skills" filter (registry-owned). */
export const HAS_SKILLS_PARAM = 'has_skills';

/** Shared table key so all project list filters use one URL/localStorage owner. */
export const PROJECTS_TABLE_KEY = 'projects';

/** Parses the job role URL value into a numeric id or null. */
const parseJobRole = (raw: string): number | null => (raw ? Number(raw) : null);

/** Parses the min-score URL value into a number or null. */
const parseMinScore = (raw: string): number | null => (raw ? Number(raw) : null);

/** Parses a nullable boolean URL value ('true'/'false') or null when absent. */
const parseBool = (raw: string): boolean | null => (raw === 'true' ? true : raw === 'false' ? false : null);

/** Serializes a nullable boolean for the URL (omitted when null). */
const serializeBool = (value: unknown): string | undefined => (value == null ? undefined : String(value));

/** Registry adding the job role, min-score, endcustomer and LLM-status filters. */
export const PROJECTS_EXTRA_PARAMS: TableParamRegistry = {
  [JOB_ROLE_PARAM]: {
    default: null,
    parse: parseJobRole,
    serialize: (value: unknown): string | undefined => (value == null ? undefined : String(value)),
  },
  [MIN_SCORE_PARAM]: {
    default: null,
    parse: parseMinScore,
    serialize: (value: unknown): string | undefined => (value == null ? undefined : String(value)),
  },
  [ENDCUSTOMER_PARAM]: { default: null, parse: parseBool, serialize: serializeBool },
  [MERGED_PARAM]: { default: null, parse: parseBool, serialize: serializeBool },
  [HAS_SKILLS_PARAM]: { default: null, parse: parseBool, serialize: serializeBool },
};

/** Reads the restored job role id from the URL for the initial ref value. */
export function readInitialJobRole(): number | null {
  return parseJobRole(new URLSearchParams(window.location.search).get(JOB_ROLE_PARAM) ?? '');
}
