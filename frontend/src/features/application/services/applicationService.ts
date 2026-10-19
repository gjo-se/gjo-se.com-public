/**
 * Application API-Service – typisierte API-Funktionen für den Bewerbungsvorgang.
 *
 * Deckt prepare, read-by-project, send und Dokument-Download ab.
 * Alle Admin-Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Verwendet native `fetch` – analog zum Application-Profile-Service.
 */
import { throwResponseError } from '@src/lib/api/apiFetch';

import type { ScoreVerdict } from './applicationScoreService';

// ── Request / Response Types ───────────────────────────────────────────────────

/** Request body for creating a communication entry (snake_case keys). */
export interface ApplicationCommunicationCreate {
  type?: string;
  direction?: string;
  subject?: string | null;
  summary?: string | null;
  outcome?: string | null;
  next_steps?: string | null;
  follow_up_date?: string | null;
  follow_up_done?: boolean;
  sentiment?: string | null;
  tag_ids?: number[];
}

export interface ApplicationCommunicationOut {
  id: number;
  applicationSubmissionId: number;
  type: string;
  direction: string;
  subject: string | null;
  date: string;
  summary: string | null;
  outcome: string | null;
  nextSteps: string | null;
  followUpDate: string | null;
  followUpDone: boolean;
  sentiment: string | null;
  createdAt: string;
  updatedAt: string;
  tags: { id: number; name: string }[];
}

export type ApplicationCommunicationUpdate = Partial<ApplicationCommunicationCreate>;

export interface ApplicationDocumentOut {
  id: number;
  applicationSubmissionId: number;
  kind: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  renderContext: Record<string, unknown> | null;
  generatedAt: string;
  createdAt: string;
}

export interface ApplicationStatusOut {
  name: string;
  slug: string;
  category: string;
  colorToken: string;
}

export interface ApplicationSubmissionDetailOut {
  id: number;
  projectId: number;
  projectTitle: string | null;
  senderProfileId: number;
  subject: string;
  body: string;
  language: Language;
  senderEmail: string;
  replyToEmail: string | null;
  recipientEmail: string;
  recipientDisplayName: string | null;
  recipientCompanyName: string | null;
  recipientPersonId: number | null;
  recipientCompanyId: number | null;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatusOut | null;
  /** Whether this submission is the current version of its project. */
  isCurrent: boolean;
  documents: ApplicationDocumentOut[];
  communications: ApplicationCommunicationOut[];
}

/** Reduced submission row for the overview table (camelCase keys). */
export interface ApplicationSubmissionListOut {
  id: number;
  projectId: number;
  projectTitle: string | null;
  /** Curated mail title (project.title_normalized); may be null → fall back to projectTitle. */
  projectTitleNormalized: string | null;
  subject: string;
  /** Sprache der Bewerbung (de/en). */
  language: Language;
  recipientEmail: string;
  recipientDisplayName: string | null;
  recipientCompanyName: string | null;
  recipientPersonId: number | null;
  recipientCompanyId: number | null;
  createdAt: string;
  updatedAt: string;
  status: ApplicationStatusOut | null;
  /** Whether this submission is the current version of its project. */
  isCurrent: boolean;
  /** Gesamtscore des letzten Score-Laufs (0–100) oder null ohne Run. */
  lastScore: number | null;
  /** Verdict des letzten Score-Laufs oder null ohne Run. */
  lastVerdict: ScoreVerdict | null;
  /** Zeitpunkt des letzten Score-Laufs oder null ohne Run. */
  lastScoredAt: string | null;
}

/** Supported application-mail languages. */
export type Language = 'de' | 'en';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_PATH = '/api/v1/admin/application-submissions';
const BASE = `${import.meta.env.VITE_API_BASE_URL}${BASE_PATH}`;
const PROFILE_CV_URL = `${import.meta.env.VITE_API_BASE_URL}/api/v1/admin/application-profile/cv`;
const opts: RequestInit = { credentials: 'include' };

// ── Functions ─────────────────────────────────────────────────────────────────

/** POST /{submissionId}/communications – append a communication entry. */
export async function createSubmissionCommunication(
  submissionId: number,
  body: ApplicationCommunicationCreate,
): Promise<ApplicationCommunicationOut> {
  const res = await fetch(`${BASE}/${encodeURIComponent(submissionId)}/communications`, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationCommunicationOut>;
}

/**
 * DELETE /{submissionId} – delete a submission incl. its artifacts (204).
 *
 * Removes the submission, its documents (incl. object-store blobs), its
 * communication history and its status link; a sent submission rolls the
 * project back so it can be prepared again.
 */
export async function deleteSubmission(submissionId: number): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(submissionId)}`, {
    ...opts,
    method: 'DELETE',
  });
  if (!res.ok) await throwResponseError(res);
}

/** DELETE /communications/{commId} – remove a communication entry (204). */
export async function deleteSubmissionCommunication(commId: number): Promise<void> {
  const res = await fetch(`${BASE}/communications/${encodeURIComponent(commId)}`, {
    ...opts,
    method: 'DELETE',
  });
  if (!res.ok) await throwResponseError(res);
}

/** GET /by-project/{projectId}/applications – list all submissions of a project. */
export async function fetchSubmissionApplications(
  projectId: number,
): Promise<ApplicationSubmissionListOut[]> {
  const res = await fetch(
    `${BASE}/by-project/${encodeURIComponent(projectId)}/applications`,
    opts,
  );
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionListOut[]>;
}

/** GET /count – count submissions with optional search/status/person/date filters. */
export async function fetchSubmissionCount(params: {
  q?: string;
  status?: string;
  crm_person_id?: number;
  from?: string;
  to?: string;
}): Promise<number> {
  const res = await fetch(`${BASE}/count${qs(params as Record<string, unknown>)}`, opts);
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<number>;
}

/** GET / – list paginated submissions with optional search/status/person/date filters. */
export async function fetchSubmissions(params: {
  q?: string;
  status?: string;
  crm_person_id?: number;
  from?: string;
  to?: string;
  offset?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}): Promise<ApplicationSubmissionListOut[]> {
  const res = await fetch(`${BASE}${qs(params as Record<string, unknown>)}`, opts);
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionListOut[]>;
}

/** GET /documents/{id}/download – returns the stored document as a Blob. */
export async function getApplicationDocumentBlob(documentId: number): Promise<Blob> {
  const res = await fetch(
    `${BASE}/documents/${encodeURIComponent(documentId)}/download`,
    opts,
  );
  if (!res.ok) await throwResponseError(res);
  return res.blob();
}

/**
 * GET /application-profile/cv – renders the project-less CV (skills tagged
 * ``site:promo``) and returns it as a Blob plus the server-provided file name
 * (``Content-Disposition``; falls back to ``Lebenslauf.pdf``).
 */
export async function getGeneralCvBlob(): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(PROFILE_CV_URL, opts);
  if (!res.ok) await throwResponseError(res);
  const disposition = res.headers.get('content-disposition') ?? '';
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? 'Lebenslauf.pdf';
  return { blob: await res.blob(), filename };
}

/** GET /{submissionId} – retrieve a single submission (404 ⇒ handled error). */
export async function getSubmission(
  submissionId: number,
): Promise<ApplicationSubmissionDetailOut> {
  const res = await fetch(`${BASE}/${encodeURIComponent(submissionId)}`, opts);
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionDetailOut>;
}

/** GET /by-project/{projectId} – read the submission or `null` (404 = none). */
export async function getSubmissionByProject(
  projectId: number,
): Promise<ApplicationSubmissionDetailOut | null> {
  const res = await fetch(
    `${BASE}/by-project/${encodeURIComponent(projectId)}`,
    opts,
  );
  if (res.status === 404) return null;
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionDetailOut>;
}

/** POST /prepare – prepares/persists a draft submission for a project in the given language. */
export async function prepareSubmission(
  projectId: number,
  language: Language,
): Promise<ApplicationSubmissionDetailOut> {
  const res = await fetch(`${BASE}/prepare`, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, language }),
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionDetailOut>;
}

/** Builds a query string from a params object, ignoring undefined/null/empty values. */
function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.set(key, String(value));
    }
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** POST /{submissionId}/send – sends (or retries) the persisted submission. */
export async function sendSubmission(
  submissionId: number,
): Promise<ApplicationSubmissionDetailOut> {
  const res = await fetch(`${BASE}/${encodeURIComponent(submissionId)}/send`, {
    ...opts,
    method: 'POST',
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionDetailOut>;
}

/** PATCH /{submissionId}/current – mark a submission as the current version. */
export async function setCurrentSubmission(
  submissionId: number,
): Promise<ApplicationSubmissionDetailOut> {
  const res = await fetch(`${BASE}/${encodeURIComponent(submissionId)}/current`, {
    ...opts,
    method: 'PATCH',
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionDetailOut>;
}

/** PUT /communications/{commId} – update a communication entry. */
export async function updateSubmissionCommunication(
  commId: number,
  body: ApplicationCommunicationUpdate,
): Promise<ApplicationCommunicationOut> {
  const res = await fetch(`${BASE}/communications/${encodeURIComponent(commId)}`, {
    ...opts,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationCommunicationOut>;
}

/** PATCH /{submissionId}/status – set the submission status (409 on illegal transition). */
export async function updateSubmissionStatus(
  submissionId: number,
  status: string,
): Promise<ApplicationSubmissionDetailOut> {
  const res = await fetch(`${BASE}/${encodeURIComponent(submissionId)}/status`, {
    ...opts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationSubmissionDetailOut>;
}
