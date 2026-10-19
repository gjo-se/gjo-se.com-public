/**
 * Application-Score API-Service – typisierte API-Funktionen für die Score-Admin-API.
 *
 * Deckt das Starten eines Score-Laufs, die Historie, den jeweils letzten Run
 * (per Vorgang und per Projekt) sowie das Run-Detail ab.
 * Alle Admin-Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Verwendet native `fetch` – Muster analog zu `applicationService.ts`.
 *
 * Hinweis zur Key-Konvention: Stammdaten und Kriterium-Zeilen liefern
 * camelCase, die abgeleiteten Felder `assessed_weight`/`missing_keys`/
 * `is_lower_bound` sowie `groups[].assessed_weight` snake_case – exakt so, wie
 * das Backend serialisiert. Ausnahme: `normalizedScore`/`isConclusive` liefern
 * camelCase (Serialization-Alias des Backends).
 */

import { throwResponseError } from '@src/lib/api/apiFetch';

// ── Request / Response Types ───────────────────────────────────────────────────

/** Serialisierte Kriterium-Zeile eines Score-Laufs. */
export interface ApplicationScoreCriterionOut {
  id: number;
  criterionKey: string;
  groupKey: string;
  value: number | null;
  weight: number;
  reason: string | null;
  evidence: string | null;
  action: string | null;
}

/** Abgeleitetes Aggregat je Gruppe (nicht persistiert). */
export interface ApplicationScoreGroupOut {
  group: string;
  score: number;
  weight: number;
  assessed_weight: number;
}

/** Eine extrahierte Anforderung aus der Ausschreibung. */
export interface ApplicationScoreRequirement {
  text: string;
  kind: 'must' | 'nice';
  /** True, wenn das Bewerbungspaket/CV die Anforderung belegt; null = nicht bewertbar. */
  covered: boolean | null;
  /** CV-Stelle/Beleg zur Anforderung (nur bei `covered === true`). */
  cv_evidence: string | null;
}

/** Vollständiges Run-Detail eines Score-Laufs. */
export interface ApplicationScoreRunOut {
  id: number;
  applicationSubmissionId: number;
  projectId: number;
  weightsVersion: string;
  totalScore: number | null;
  verdict: ScoreVerdict | null;
  llmCallLogId: number | null;
  createdAt: string;
  completedAt: string | null;
  requirements: ApplicationScoreRequirement[];
  criteria: ApplicationScoreCriterionOut[];
  groups: ApplicationScoreGroupOut[];
  assessed_weight: number;
  missing_keys: string[];
  is_lower_bound: boolean;
  normalizedScore: number | null;
  isConclusive: boolean;
}

/** Request body zum Starten eines Score-Laufs (genau eines von project_id/submission_id). */
export interface ApplicationScoreStartBody {
  project_id?: number;
  submission_id?: number;
  description_override?: string;
}

/** Aggregiertes Verdikt eines Score-Laufs (feste Schwellen, weights_version). */
export type ScoreVerdict = 'ready' | 'borderline' | 'weak';

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_PATH = '/api/v1/admin/application-score';
const BASE = `${import.meta.env.VITE_API_BASE_URL}${BASE_PATH}`;
const opts: RequestInit = { credentials: 'include' };

// ── Functions ─────────────────────────────────────────────────────────────────

/** GET /by-project/{projectId}/latest – letzter Run des Projekt-Vorgangs oder `null` (404). */
export async function fetchLatestScoreByProject(
  projectId: number,
): Promise<ApplicationScoreRunOut | null> {
  const res = await fetch(
    `${BASE}/by-project/${encodeURIComponent(projectId)}/latest`,
    opts,
  );
  if (res.status === 404) return null;
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationScoreRunOut>;
}

/** GET /by-submission/{submissionId}/latest – letzter Run oder `null` (404 = keiner). */
export async function fetchLatestScoreBySubmission(
  submissionId: number,
): Promise<ApplicationScoreRunOut | null> {
  const res = await fetch(
    `${BASE}/by-submission/${encodeURIComponent(submissionId)}/latest`,
    opts,
  );
  if (res.status === 404) return null;
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationScoreRunOut>;
}

/** GET /by-submission/{submissionId} – append-only Score-Historie (neueste zuerst). */
export async function fetchScoreHistory(
  submissionId: number,
): Promise<ApplicationScoreRunOut[]> {
  const res = await fetch(
    `${BASE}/by-submission/${encodeURIComponent(submissionId)}`,
    opts,
  );
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationScoreRunOut[]>;
}

/** GET /{runId} – Score-Run-Detail per id. */
export async function fetchScoreRun(runId: number): Promise<ApplicationScoreRunOut> {
  const res = await fetch(`${BASE}/${encodeURIComponent(runId)}`, opts);
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationScoreRunOut>;
}

/** POST – führt einen vollständigen Score-Lauf aus und liefert dessen Detail. */
export async function startScoreRun(
  body: ApplicationScoreStartBody,
): Promise<ApplicationScoreRunOut> {
  const res = await fetch(BASE, {
    ...opts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationScoreRunOut>;
}
