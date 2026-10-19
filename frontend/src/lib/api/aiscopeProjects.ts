/**
 * Normalised project endpoints (list, detail, edit, canonical linking, scores).
 */
import { api } from '@src/lib/api/axios';

import { projectsBase } from './aiscopeEndpoints';

import type { SetCanonicalResponse } from './aiscopeCanonical';
import type { ProjectStatus } from './aiscopeTypes';

/** Filter params shared by the AIScope project list/count/sibling queries. */
export interface AiscopeProjectFilters {
  q?: string
  search_term_id?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  /** ISO date string YYYY-MM-DD – filter by posted_at >= from */
  from?: string
  /** ISO date string YYYY-MM-DD – filter by posted_at <= to */
  to?: string
  /** If false, include slave projects (default: true, masters only) */
  masters_only?: boolean
  /** Exact status filter (takes precedence over include_archived). */
  status?: ProjectStatus
  /** If no status is set and true, include archived projects. */
  include_archived?: boolean
  /** Lower bound for match_score (inclusive). Excludes rows without a score. */
  min_score?: number
  /** If false, only NOT merged projects. */
  merged?: boolean
  /** If false, only projects without linked skills. */
  has_skills?: boolean
  /** If true, only Endkunden-Projekte; if false, nur Vermittler. */
  endcustomer?: boolean
}

/** A single failed project during text-backfill. */
export interface BackfillSkillError {
  project_id: number;
  error: string;
}

/** Result of a text-backfill run. */
export interface BackfillSkillsResult {
  scanned: number;
  linked: number;
  errors: BackfillSkillError[];
}

/** Normalised project scraped from a job portal and enriched with company + contact info. */
export interface Project {
  id: number
  canonical_id: number | null
  similarity_score: number | null
  match_score: number | null
  confirmed_score: number | null
  /** Abgeleiteter Public-Score: wie confirmed_score (nur aktive Skills), aber mit level_public. */
  public_score: number | null
  url: string
  title: string
  title_normalized: string | null
  description: string | null
  merged_description_de: string | null
  merged_at: string | null
  last_merge_call_log_id: number | null
  city: string | null
  country: string | null
  remote_percent: number | null
  contract_type: string | null
  duration: string | null
  start_date: string | null
  posted_at: string | null
  scraped_at: string | null
  search_term: string | null
  job_role_name: string | null
  merge_dirty: boolean
  /** Company name (CRM-supplemented, lives directly on the project after Ticket 1183). */
  company_name: string | null
  /** Contact person name (CRM-supplemented, lives directly on the project after Ticket 1183). */
  contact_name: string | null
  /** Industry classification from freelancermap (e.g. IT, Finanzen). */
  industry: string | null
  /** Freitext-Bemerkungen zum Projekt (Markdown-Rohquelle; null = keine Bemerkungen). */
  notes: string | null
  /** Geschätzter Angebots-Stundensatz (EUR/h, Obergrenze der Schätzung; null = nicht geschätzt). */
  hourly_rate: number | null
  /** Eigener (manuell gepflegter) Stundensatz in EUR/h (null = kein eigener Satz). */
  my_hourly_rate: number | null
  /**
   * Manueller Start-Override (`MM/YYYY` oder `DD.MM.YYYY`; Ignore-Token `-`/`nein`/`ignore`/`n/a`).
   * Überschreibt Ausschreibungstext und `start_date` in CV + Score (null = kein Override).
   */
  my_start_date: string | null
  /** Direct award from end client (True) or via intermediary (False). None = unknown. */
  endcustomer: boolean | null
  /** Timestamp of the last endcustomer research run (UTC). */
  endcustomer_researched_at: string | null
  skills: ProjectSkillOut[]
  slave_count: number
  /** Primary key of the matching raw dataset in `project_freelancer_map` (resolved by url; null = no raw entry). */
  freelancermap_id: number | null
  status: ProjectStatus
  /** Color token of the current status (from core_status, e.g. 'green'). */
  status_color_token: string | null
}

/** Result of the deterministic two-layer hourly-rate estimate. */
export interface ProjectRateEstimate {
  base_rate: number
  hourly_rate: number
  target_rate: number
  factors: RateFactor[]
  uncertainties: string[]
}

/** A skill linked to a project (for badges + match signal). */
export interface ProjectSkillOut {
  id: number
  name: string
  effective_importance: number | null
  level: number | null
  /** Public-facing knowledge level (0–5); null = unknown. */
  level_public: number | null
  status?: string | null
}

/** A single applied factor of the deterministic hourly-rate estimate. */
export interface RateFactor {
  label: string
  factor: number
  evidence: string | null
}

/** Recalculated match scores for a single project. */
export interface RecalculatedScores {
  project_id: number
  match_score: number | null
  confirmed_score: number | null
  public_score: number | null
}

/** Neighbour ids (prev/next) of a project within the current list view. */
export interface SiblingsResponse {
  prev_id: number | null
  next_id: number | null
}

/** Permanently deletes a normalised project. */
export async function deleteProject(projectId: number): Promise<void> {
  await api.delete(`${projectsBase}/${projectId}`);
}

/**
 * Deterministically estimates + persists the offer hourly rate via
 * POST /admin/fbf/projects/{id}/hourly-rate/estimate.
 *
 * Rule-based (Basisrate × Projekt-/Länderfaktoren) – no LLM call. Persists only
 * `hourly_rate` (the project deckel); `my_hourly_rate` stays untouched.
 */
export async function estimateProjectHourlyRate(id: number): Promise<ProjectRateEstimate> {
  const response = await api.post<ProjectRateEstimate>(`${projectsBase}/${id}/hourly-rate/estimate`);
  return response.data;
}

/** Finds Master projects eligible as a new master via GET .../projects/master-candidates. */
export async function fetchMasterCandidates(
  q: string,
  excludeId: number,
  excludeCurrentMasterId: number,
): Promise<Project[]> {
  const response = await api.get<Project[]>(`${projectsBase}/master-candidates`, {
    params: { q: q.trim() || undefined, exclude_id: excludeId, exclude_current_master_id: excludeCurrentMasterId },
  });
  return response.data;
}

/** Fetches a single normalised project by ID via GET /admin/fbf/projects/{id}. */
export async function fetchProjectById(id: number): Promise<Project> {
  const response = await api.get<Project>(`${projectsBase}/${id}`);
  return response.data;
}

/** Returns the total count of normalised projects with optional filters via GET /admin/fbf/projects/count. */
export async function fetchProjectCount(params: AiscopeProjectFilters): Promise<number> {
  const response = await api.get<{ total: number }>(`${projectsBase}/count`, { params });
  return response.data.total;
}

/** Fetches paginated normalised projects with optional filters via GET /admin/fbf/projects. */
export async function fetchProjects(params: AiscopeProjectFilters & {
  offset?: number
  limit?: number
}): Promise<Project[]> {
  const response = await api.get<Project[]>(projectsBase, { params });
  return response.data;
}

/**
 * Fetches the prev/next project ids for the current filtered, sorted list view
 * via GET /admin/fbf/projects/{id}/siblings. Params mirror fetchProjects.
 */
export async function fetchProjectSiblings(id: number, params: AiscopeProjectFilters): Promise<SiblingsResponse> {
  const response = await api.get<SiblingsResponse>(`${projectsBase}/${id}/siblings`, { params });
  return response.data;
}

/** Fetches all slave projects for a master project via GET /admin/fbf/projects/{masterId}/slaves. */
export async function fetchProjectSlaves(masterId: number): Promise<Project[]> {
  const response = await api.get<Project[]>(`${projectsBase}/${masterId}/slaves`);
  return response.data;
}

/** Finds projects eligible to be linked as slaves via GET .../projects/slave-candidates. */
export async function fetchSlaveCandidates(
  q: string,
  excludeCanonicalId: number,
): Promise<Project[]> {
  const response = await api.get<Project[]>(`${projectsBase}/slave-candidates`, {
    params: { q: q.trim() || undefined, exclude_canonical_id: excludeCanonicalId },
  });
  return response.data;
}

/** Recalculates match scores for all projects (no LLM – pure DB operation). */
export async function recalculateAllScores(): Promise<{ updated: number; total: number }> {
  const res = await api.post<{ updated: number; total: number }>(
    '/admin/fbf/projects/recalculate-scores',
  );
  return res.data;
}

/** Recalculates match score for a single project. */
export async function recalculateProjectScore(projectId: number): Promise<RecalculatedScores> {
  const res = await api.post<RecalculatedScores>(`/admin/fbf/projects/${projectId}/recalculate-score`);
  return res.data;
}

/** Search normalised projects by title/description via GET /admin/fbf/projects. */
export async function searchProjects(q: string, limit = 10): Promise<Project[]> {
  return fetchProjects({ q, limit, sort_by: 'posted_at', sort_order: 'desc' });
}

/** Links a project directly to a master via POST .../projects/{project_id}/set-canonical. */
export async function setProjectCanonical(
  projectId: number,
  canonicalProjectId: number | null,
): Promise<SetCanonicalResponse> {
  const response = await api.post<SetCanonicalResponse>(
    `${projectsBase}/${projectId}/set-canonical`,
    { canonical_project_id: canonicalProjectId },
  );
  return response.data;
}

/**
 * Sets the estimated offer hourly rate via PATCH /admin/fbf/projects/{id}/hourly-rate.
 *
 * `null` clears the estimate.
 */
export async function setProjectHourlyRate(id: number, hourlyRate: number | null): Promise<Project> {
  const response = await api.patch<Project>(`${projectsBase}/${id}/hourly-rate`, {
    hourly_rate: hourlyRate,
  });
  return response.data;
}

/**
 * Sets the own (manually curated) hourly rate via PATCH /admin/fbf/projects/{id}/my-hourly-rate.
 *
 * `null` clears it.
 */
export async function setProjectMyHourlyRate(id: number, myHourlyRate: number | null): Promise<Project> {
  const response = await api.patch<Project>(`${projectsBase}/${id}/my-hourly-rate`, {
    my_hourly_rate: myHourlyRate,
  });
  return response.data;
}

/**
 * Sets the manual start override via PATCH /admin/fbf/projects/{id}/my-start-date.
 *
 * Accepts `MM/YYYY` or `DD.MM.YYYY`, an ignore token (`-`/`nein`/`ignore`/`n/a`),
 * or `null` to clear it. The override wins over posting text and `start_date`.
 */
export async function setProjectMyStartDate(id: number, myStartDate: string | null): Promise<Project> {
  const response = await api.patch<Project>(`${projectsBase}/${id}/my-start-date`, {
    my_start_date: myStartDate,
  });
  return response.data;
}

/**
 * Sets the free-text notes (Markdown source) via PATCH /admin/fbf/projects/{id}/notes.
 *
 * `null` clears the notes.
 */
export async function setProjectNotes(id: number, notes: string | null): Promise<Project> {
  const response = await api.patch<Project>(`${projectsBase}/${id}/notes`, { notes });
  return response.data;
}

/** Sets the exclusive status of a project via PATCH /admin/fbf/projects/{id}/status. */
export async function setProjectStatus(id: number, status: ProjectStatus): Promise<Project> {
  const response = await api.patch<Project>(`${projectsBase}/${id}/status`, { status });
  return response.data;
}

/**
 * Sets the curated mail title via PATCH /admin/fbf/projects/{id}/title-normalized.
 *
 * The value is the single role source for subject and body of the application
 * mail; `null` clears the override (fallback: normalized scraped title).
 */
export async function setProjectTitleNormalized(id: number, titleNormalized: string | null): Promise<Project> {
  const response = await api.patch<Project>(`${projectsBase}/${id}/title-normalized`, {
    title_normalized: titleNormalized,
  });
  return response.data;
}

/** Triggers text-backfill: scans all master projects against the skill DB. */
export async function triggerSkillBackfill(): Promise<BackfillSkillsResult> {
  const res = await api.post<BackfillSkillsResult>(
    '/admin/fbf/projects/backfill-skills',
  );
  return res.data;
}
