/**
 * Application Profile API-Service – typisierte API-Funktionen für
 * Profil, Karriere-Stationen und Sprachen.
 *
 * Alle Admin-Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Der Public-Endpoint benötigt kein Auth.
 * Verwendet native `fetch` – analog zum CRM-Service.
 */

// ── Request / Response Types ───────────────────────────────────────────────────

import { apiFetch } from '@src/lib/api/apiFetch';
import type { AssetInfo } from '@src/lib/api/assetTypes';

export interface ApplicationProfileCreate {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  remote?: string | null;
  languages?: string | null;
  photo_url?: string | null;
  headline?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  hourly_rate?: number | string | null;
  hourly_rate_currency?: string | null;
  available_from?: string | null;
  translations?: Record<string, ApplicationProfileLocaleFields> | null;
}

/** Localized story fields per locale (translation-table pattern). */
export interface ApplicationProfileLocaleFields {
  story?: string | null;
}

export interface ApplicationProfileOut {
  id: number;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  remote?: string | null;
  languages?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  hourlyRate?: number | string | null;
  hourlyRateCurrency?: string | null;
  availableFrom?: string | null;
  translations?: Record<string, ApplicationProfileLocaleFields>;
  createdAt: string;
  updatedAt: string;
}

/** Public whitelist of the profile – excludes the admin-only sender fields. */
export interface ApplicationProfilePublicOut {
  id: number;
  fullName: string;
  location?: string | null;
  remote?: string | null;
  languages?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  translations?: Record<string, ApplicationProfileLocaleFields>;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationProfilePublicResponse {
  profile: ApplicationProfilePublicOut;
  career: CareerEntryOut[];
  languages: string[];
  skills: SkillPublicOut[];
  story?: string | null;
  focusAreas: FocusAreaOut[];
}

export interface CareerEntryCreate {
  position: string;
  company?: string | null;
  project_url?: string | null;
  start_date: string;
  end_date?: string | null;
  sort?: number;
  translations?: Record<string, CareerLocaleFields> | null;
}

export interface CareerEntryOut {
  id: number;
  applicationProfileId: number;
  position: string;
  company?: string | null;
  projectUrl?: string | null;
  startDate: string;
  endDate?: string | null;
  sort: number;
  description?: string | null;
  status: string | null;
  status_color_token: string | null;
  createdAt: string;
  updatedAt: string;
  translations?: Record<string, CareerLocaleFields>;
}

export interface CareerEntryUpdate {
  position?: string | null;
  company?: string | null;
  project_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort?: number | null;
  translations?: Record<string, CareerLocaleFields> | null;
}

/** Localized description per locale (translation-table pattern). */
export interface CareerLocaleFields {
  description?: string | null;
}

/** Localized title/body for one decision (per locale). */
export interface DecisionLocaleFields {
  title?: string | null;
  body?: string | null;
  discarded?: string | null;
}

/** Request body for creating a new experience project (snake_case keys). */
export interface ExperienceCreate {
  position: string;
  company?: string | null;
  project_url?: string | null;
  start_date: string;
  end_date?: string | null;
  sort?: number;
  translations?: Record<string, ExperienceLocaleFields> | null;
  decisions?: ExperienceDecisionInput[];
  proofs?: ExperienceProofInput[];
}

/** Serialized decision bullet (structure + localized fields). */
export interface ExperienceDecision {
  id: number;
  sort: number;
  translations: Record<string, DecisionLocaleFields>;
}

/** One decision bullet within a create/update request. */
export interface ExperienceDecisionInput {
  sort?: number;
  translations?: Record<string, DecisionLocaleFields> | null;
}

/**
 * Localized text blocks for one experience translation (per locale).
 *
 * Field names match the BE out schema exactly (snake_case, no aliases).
 */
export interface ExperienceLocaleFields {
  context?: string | null;
  outcome?: string | null;
  problem?: string | null;
  scope?: string | null;
  solution_what?: string | null;
  tech_stack?: string | null;
  evidence?: string | null;
}

/** Serialized experience project (camelCase keys, full structure + children). */
export interface ExperienceOut {
  id: number;
  applicationProfileId: number;
  position: string;
  company?: string | null;
  projectUrl?: string | null;
  startDate: string;
  endDate?: string | null;
  sort: number;
  status?: string | null;
  status_color_token: string | null;
  createdAt: string;
  updatedAt: string;
  translations?: Record<string, ExperienceLocaleFields>;
  decisions: ExperienceDecision[];
  proofs: ExperienceProof[];
}

/** Serialized proof bullet (structure + localized fields). */
export interface ExperienceProof {
  id: number;
  sort: number;
  translations: Record<string, ProofLocaleFields>;
}

/** One proof bullet within a create/update request. */
export interface ExperienceProofInput {
  sort?: number;
  translations?: Record<string, ProofLocaleFields> | null;
}

/** Request body for partially updating an experience project (snake_case keys). */
export interface ExperienceUpdate {
  position?: string | null;
  company?: string | null;
  project_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  sort?: number | null;
  translations?: Record<string, ExperienceLocaleFields> | null;
  decisions?: ExperienceDecisionInput[] | null;
  proofs?: ExperienceProofInput[] | null;
}

export interface FocusAreaCreate {
  slug: string;
  url?: string | null;
  sort?: number;
  translations?: Record<string, FocusAreaLocaleFields> | null;
}

/** Localized focus-area fields per locale (translation-table pattern). */
export interface FocusAreaLocaleFields {
  title?: string | null;
  summary?: string | null;
}

export interface FocusAreaOut {
  id: number;
  applicationProfileId: number;
  slug: string;
  url?: string | null;
  sort: number;
  title?: string | null;
  summary?: string | null;
  translations?: Record<string, FocusAreaLocaleFields>;
  createdAt: string;
  updatedAt: string;
}

export interface FocusAreaUpdate {
  slug?: string | null;
  url?: string | null;
  sort?: number | null;
  translations?: Record<string, FocusAreaLocaleFields> | null;
}

/** Localized text for one proof bullet (per locale). */
export interface ProofLocaleFields {
  text?: string | null;
}

export interface SkillPublicOut {
  id: number;
  name: string;
  levelPublic?: number | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = '/api/v1';

// ── Profile (Admin) ────────────────────────────────────────────────────────────

/** POST /api/v1/admin/application-profile/career – Create a career entry. */
export function createCareerEntry(
  data: CareerEntryCreate,
): Promise<CareerEntryOut> {
  return apiFetch<CareerEntryOut>(`${BASE}/admin/application-profile/career`, {
    method: 'POST',
    body: data,
  });
}

/** POST /api/v1/admin/application-profile/experience – Create an experience project. */
export function createExperience(data: ExperienceCreate): Promise<ExperienceOut> {
  return apiFetch<ExperienceOut>(`${BASE}/admin/application-profile/experience`, {
    method: 'POST',
    body: data,
  });
}

// ── Focus Areas (Admin) ────────────────────────────────────────────────────────

/** POST /api/v1/admin/application-profile/focus-areas – Create a focus area. */
export function createFocusArea(data: FocusAreaCreate): Promise<FocusAreaOut> {
  return apiFetch<FocusAreaOut>(`${BASE}/admin/application-profile/focus-areas`, {
    method: 'POST',
    body: data,
  });
}

/** DELETE /api/v1/admin/application-profile/career/{id} – Delete a career entry. */
export function deleteCareerEntry(id: number): Promise<void> {
  return apiFetch<void>(
    `${BASE}/admin/application-profile/career/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

/** DELETE /api/v1/admin/application-profile/experience/{id} – Delete an experience project. */
export function deleteExperience(id: number): Promise<void> {
  return apiFetch<void>(
    `${BASE}/admin/application-profile/experience/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

/** DELETE /api/v1/admin/application-profile/focus-areas/{id} – Delete a focus area. */
export function deleteFocusArea(id: number): Promise<void> {
  return apiFetch<void>(
    `${BASE}/admin/application-profile/focus-areas/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

/** GET /api/v1/admin/application-profile – Retrieve the singleton profile. */
export function getProfile(): Promise<ApplicationProfileOut> {
  return apiFetch<ApplicationProfileOut>(`${BASE}/admin/application-profile`);
}

// ── Career Entries (Admin) ─────────────────────────────────────────────────────

/** GET /api/v1/public/application-profile?locale= – Public aggregated profile (About page). */
export function getPublicProfile(locale: string): Promise<ApplicationProfilePublicResponse> {
  return apiFetch<ApplicationProfilePublicResponse>(
    `${BASE}/public/application-profile`,
    { query: { locale } },
  );
}

/** GET /api/v1/admin/application-profile/assets?prefix= – ObjectStore-Assets (Datei-Picker). */
export function listApplicationProfileAssets(prefix = ''): Promise<AssetInfo[]> {
  return apiFetch<AssetInfo[]>(`${BASE}/admin/application-profile/assets`, {
    query: { prefix },
  });
}

/** GET /api/v1/admin/application-profile/career – List all career entries. */
export function listCareerEntries(): Promise<CareerEntryOut[]> {
  return apiFetch<CareerEntryOut[]>(`${BASE}/admin/application-profile/career`);
}

/** GET /api/v1/admin/application-profile/experience – List all experience projects. */
export function listExperiences(): Promise<ExperienceOut[]> {
  return apiFetch<ExperienceOut[]>(`${BASE}/admin/application-profile/experience`);
}

// ── Career Entries (Admin) ─────────────────────────────────────────────────────

/** GET /api/v1/admin/application-profile/focus-areas – List all focus areas. */
export function listFocusAreas(): Promise<FocusAreaOut[]> {
  return apiFetch<FocusAreaOut[]>(`${BASE}/admin/application-profile/focus-areas`);
}

/** PATCH /api/v1/admin/application-profile/career/reorder – Reorder career entries. */
export function reorderCareerEntries(
  orderedIds: number[],
): Promise<CareerEntryOut[]> {
  return apiFetch<CareerEntryOut[]>(`${BASE}/admin/application-profile/career/reorder`, {
    method: 'PATCH',
    body: { ordered_ids: orderedIds },
  });
}

/** PATCH /api/v1/admin/application-profile/experience/reorder – Reorder experience projects. */
export function reorderExperiences(orderedIds: number[]): Promise<ExperienceOut[]> {
  return apiFetch<ExperienceOut[]>(`${BASE}/admin/application-profile/experience/reorder`, {
    method: 'PATCH',
    body: { ordered_ids: orderedIds },
  });
}

/** PATCH /api/v1/admin/application-profile/focus-areas/reorder – Reorder focus areas. */
export function reorderFocusAreas(orderedIds: number[]): Promise<FocusAreaOut[]> {
  return apiFetch<FocusAreaOut[]>(`${BASE}/admin/application-profile/focus-areas/reorder`, {
    method: 'PATCH',
    body: { ordered_ids: orderedIds },
  });
}

/** PUT /api/v1/admin/application-profile/career/{id} – Update a career entry. */
export function updateCareerEntry(
  id: number,
  data: CareerEntryUpdate,
): Promise<CareerEntryOut> {
  return apiFetch<CareerEntryOut>(
    `${BASE}/admin/application-profile/career/${encodeURIComponent(id)}`,
    { method: 'PUT', body: data },
  );
}

/** PUT /api/v1/admin/application-profile/experience/{id} – Update an experience project. */
export function updateExperience(
  id: number,
  data: ExperienceUpdate,
): Promise<ExperienceOut> {
  return apiFetch<ExperienceOut>(
    `${BASE}/admin/application-profile/experience/${encodeURIComponent(id)}`,
    { method: 'PUT', body: data },
  );
}

/** PUT /api/v1/admin/application-profile/focus-areas/{id} – Update a focus area. */
export function updateFocusArea(
  id: number,
  data: FocusAreaUpdate,
): Promise<FocusAreaOut> {
  return apiFetch<FocusAreaOut>(
    `${BASE}/admin/application-profile/focus-areas/${encodeURIComponent(id)}`,
    { method: 'PUT', body: data },
  );
}

/**
 * POST /api/v1/admin/application-profile/photo – Upload the portrait photo.
 *
 * Multipart upload (SVG/PNG/JPEG/WebP, max. 5 MB). No Content-Type header is
 * set explicitly so the browser adds the multipart boundary. Returns the
 * updated profile (photo_url contains the new storage key).
 */
export function uploadProfilePhoto(file: File): Promise<ApplicationProfileOut> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<ApplicationProfileOut>(`${BASE}/admin/application-profile/photo`, {
    method: 'POST',
    rawBody: formData,
  });
}

// ── Public ─────────────────────────────────────────────────────────────────────

/** PUT /api/v1/admin/application-profile – Create or update the profile (Upsert). */
export function upsertProfile(
  data: ApplicationProfileCreate,
): Promise<ApplicationProfileOut> {
  return apiFetch<ApplicationProfileOut>(`${BASE}/admin/application-profile`, {
    method: 'PUT',
    body: data,
  });
}
