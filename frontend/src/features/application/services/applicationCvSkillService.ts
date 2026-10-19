/**
 * Application-CV-Skill API-Service – Batch-Add fehlender CV-Skills via FBF-Pipeline.
 *
 * Sendet die ausgewählten Skill-Namen als EINEN Batch an das Backend, das je
 * Skill Existenz prüft bzw. einen neuen Slave anlegt, ihn über die Dedup-
 * Pipeline seinem Master zuordnet und das CV genau einmal neu rendert (Ersatz
 * des alten Snapshots). Gruppen/Level/Importance werden ausschließlich vom
 * Master gesteuert und sind hier bewusst nicht Teil des Requests.
 * Zusätzlich: manuelles Re-Render ohne Skill-Änderung (nach Umhängungen).
 * Alle Admin-Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Verwendet native `fetch` – Muster analog zu `applicationScoreService.ts`.
 */

import { throwResponseError } from '@src/lib/api/apiFetch';
import type { components } from '@src/lib/types.generated';

// ── Request / Response Types ───────────────────────────────────────────────────

/** Serialisiertes Bewerbungsdokument (Antwort des Batch-Adds). */
export type ApplicationDocumentOut = components['schemas']['DocumentOut'];

/** Ein hinzuzufügender CV-Skill (nur Name; Master/Zuordnung macht das Backend). */
export interface CvSkillAddItem {
  name: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL;
const opts: RequestInit = { credentials: 'include' };

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/application-submissions/{submissionId}/cv-skills – fügt die
 * Skills als EINEN Batch hinzu, rendert das CV einmalig neu und liefert das
 * frische Dokument zurück.
 */
export async function addCvSkills(
  submissionId: number,
  items: CvSkillAddItem[],
): Promise<ApplicationDocumentOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/application-submissions/${encodeURIComponent(submissionId)}/cv-skills`,
    {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    },
  );
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationDocumentOut>;
}

/**
 * POST /api/v1/admin/application-submissions/{submissionId}/cv-skills/exclude –
 * schließt einen Skill vom Master getrennt + `rejected` aus dem CV aus (global)
 * und rendert das CV einmalig neu; liefert das frische Dokument zurück.
 */
export async function excludeCvSkill(
  submissionId: number,
  name: string,
): Promise<ApplicationDocumentOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/application-submissions/${encodeURIComponent(submissionId)}/cv-skills/exclude`,
    {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
  );
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationDocumentOut>;
}

/**
 * POST /api/v1/admin/application-submissions/{submissionId}/cv-regenerate –
 * rendert das CV einmalig neu, ohne Skills zu ändern (manueller Refresh nach
 * Umhängungen/Zuordnungen). Ersetzt den alten Snapshot.
 *
 * `useDefaultSkills` schaltet die gruppierte Skill-Sektion von den Projekt-
 * Skills auf die kuratierten Default-Skills um; ohne Angabe erbt das Re-Render
 * den zuletzt am Snapshot gewählten Modus.
 */
export async function regenerateSubmissionCv(
  submissionId: number,
  useDefaultSkills?: boolean,
): Promise<ApplicationDocumentOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/application-submissions/${encodeURIComponent(submissionId)}/cv-regenerate`,
    {
      ...opts,
      method: 'POST',
      headers: useDefaultSkills === undefined ? undefined : { 'Content-Type': 'application/json' },
      body:
        useDefaultSkills === undefined
          ? undefined
          : JSON.stringify({ use_default_skills: useDefaultSkills }),
    },
  );
  if (!res.ok) await throwResponseError(res);
  return res.json() as Promise<ApplicationDocumentOut>;
}
