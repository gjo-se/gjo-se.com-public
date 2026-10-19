/**
 * CRM API-Service – typisierte API-Funktionen für Companies, Persons, Addresses, Enrichment.
 *
 * Alle Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Nutzt den gemeinsamen `apiFetch`-Helper (siehe `@src/lib/api/apiFetch`).
 */
import { apiFetch, apiFetchRaw } from '@src/lib/api/apiFetch';
import type { components } from '@src/lib/types.generated';

// ── Type aliases from generated OpenAPI types ─────────────────────────────────

type CrmAddressCreate = components['schemas']['AddressCreate'];
type CrmAddressOut = components['schemas']['AddressOut'];
type CrmAddressUpdate = components['schemas']['AddressUpdate'];

type CrmCompanyCreate = components['schemas']['CompanyCreate'];
type CrmCompanyOut = components['schemas']['CompanyOut'];
type CrmCompanyUpdate = components['schemas']['CompanyUpdate'];

type CrmEnrichRequest = components['schemas']['EnrichRequest'];

type CrmPersonCreate = components['schemas']['PersonCreate'];
type CrmPersonOut = components['schemas']['PersonOut'];
type CrmPersonUpdate = components['schemas']['PersonUpdate'];

type ProjectCrmPersonCreate = components['schemas']['ProjectPersonCreate'];
type ProjectCrmPersonOut = components['schemas']['ProjectPersonOut'];

export type ProjectEnrichRequest = components['schemas']['ProjectEnrichRequest'];

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE = '/api/v1/admin/crm';
const BASE_PROJECTS = '/api/v1/admin';

// ── Project Enrich Types ──────────────────────────────────────────────────────

/** Details reported by the enrichment pipeline (superset of the enriched flags). */
export interface ProjectEnrichmentDetails {
  company_enriched?: boolean;
  person_enriched?: boolean;
  hunter_skipped?: boolean;
  /** Normalised Hunter failure reason, e.g. `insufficient_credits`. */
  hunter_error?: string;
  /** Raw message from the Hunter error body, if any. */
  hunter_error_message?: string;
  [key: string]: unknown;
}

/** Response from POST /api/v1/admin/crm/project-enrich/{id}/enrich-contacts */
export interface ProjectEnrichResponse {
  company: CrmCompanyOut;
  person: CrmPersonOut;
  project_crm_person_link_id: number;
  enrichment_details: ProjectEnrichmentDetails | null;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/** POST /companies/{id}/addresses – Create an address for a company. */
export function createAddress(
  companyId: number,
  data: CrmAddressCreate,
): Promise<CrmAddressOut> {
  return apiFetch<CrmAddressOut>(
    `${BASE}/companies/${encodeURIComponent(companyId)}/addresses`,
    { method: 'POST', body: data },
  );
}

/** POST /companies – Create a new company. */
export function createCompany(data: CrmCompanyCreate): Promise<CrmCompanyOut> {
  return apiFetch<CrmCompanyOut>(`${BASE}/companies`, { method: 'POST', body: data });
}

/** POST /persons – Create a new person. */
export function createPerson(data: CrmPersonCreate): Promise<CrmPersonOut> {
  return apiFetch<CrmPersonOut>(`${BASE}/persons`, { method: 'POST', body: data });
}

/** POST /project-crm-persons – Link a project to a CRM person (409 on duplicate). */
export function createProjectCrmPerson(
  data: ProjectCrmPersonCreate,
): Promise<ProjectCrmPersonOut> {
  return apiFetch<ProjectCrmPersonOut>(`${BASE}/project-crm-persons`, {
    method: 'POST',
    body: data,
  });
}

/** DELETE /companies/{id}/addresses/{id} – Delete an address. */
export function deleteAddress(companyId: number, addressId: number): Promise<void> {
  return apiFetch<void>(
    `${BASE}/companies/${encodeURIComponent(companyId)}/addresses/${encodeURIComponent(addressId)}`,
    { method: 'DELETE' },
  );
}

/** DELETE /companies/{id} – Delete a company by ID. */
export function deleteCompany(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/companies/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** DELETE /persons/{id} – Delete a person by ID. */
export function deletePerson(id: number): Promise<void> {
  return apiFetch<void>(`${BASE}/persons/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** DELETE /project-crm-persons/{id} – Remove a project↔person link. */
export function deleteProjectCrmPerson(ppId: number): Promise<void> {
  return apiFetch<void>(`${BASE}/project-crm-persons/${encodeURIComponent(ppId)}`, {
    method: 'DELETE',
  });
}

/** POST /persons/{id}/enrich – Enrich an existing person via Hunter Lead Enrich. */
export function enrichExistingPerson(personId: number): Promise<CrmPersonOut> {
  return apiFetch<CrmPersonOut>(`${BASE}/persons/${encodeURIComponent(personId)}/enrich`, {
    method: 'POST',
  });
}

/** POST /api/v1/admin/persons/{id}/enrich – Create and enrich a person via Hunter.io. */
export function enrichPerson(data: CrmEnrichRequest): Promise<CrmPersonOut> {
  return apiFetch<CrmPersonOut>(`${BASE}/persons/enrich`, { method: 'POST', body: data });
}

/** POST /api/v1/admin/crm/project-enrich/{id}/enrich-contacts – Run the full enrichment pipeline for a project. */
export function enrichProjectContacts(
  projectId: number,
  body?: ProjectEnrichRequest,
): Promise<ProjectEnrichResponse> {
  return apiFetch<ProjectEnrichResponse>(
    `${BASE_PROJECTS}/crm/project-enrich/${projectId}/enrich-contacts`,
    { method: 'POST', body: body ?? {} },
  );
}

/** POST /companies/{id}/extract-address – Extract address from website imprint via LLM. */
export async function extractCompanyAddress(companyId: number): Promise<CrmAddressOut> {
  const res = await apiFetchRaw(
    `${BASE}/companies/${encodeURIComponent(companyId)}/extract-address`,
    { method: 'POST' },
  );
  // Backend returns 200 (not 201) when no address was found or already exists
  if (res.status === 200) {
    const body = (await res.json()) as { message?: string };
    throw new Error(body.message || 'Keine Adresse gefunden');
  }
  return res.json() as Promise<CrmAddressOut>;
}

/** GET /companies/{id}/addresses – List all addresses for a company. */
export function fetchAddresses(companyId: number): Promise<CrmAddressOut[]> {
  return apiFetch<CrmAddressOut[]>(
    `${BASE}/companies/${encodeURIComponent(companyId)}/addresses`,
  );
}

/** GET /companies – List paginated companies with optional name search. */
export function fetchCompanies(params: {
  limit?: number;
  offset?: number;
  q?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<CrmCompanyOut[]> {
  return apiFetch<CrmCompanyOut[]>(`${BASE}/companies`, { query: params });
}

/** GET /companies/count – Count companies with optional name search. */
export function fetchCompanyCount(params: { q?: string }): Promise<number> {
  return apiFetch<number>(`${BASE}/companies/count`, { query: params });
}

/** GET /companies/{id}/persons – List persons linked to a company. */
export function fetchCompanyPersons(companyId: number): Promise<CrmPersonOut[]> {
  return apiFetch<CrmPersonOut[]>(
    `${BASE}/companies/${encodeURIComponent(companyId)}/persons`,
  );
}

/** GET /persons/count – Count persons with optional name/email search. */
export function fetchPersonCount(params: { q?: string }): Promise<number> {
  return apiFetch<number>(`${BASE}/persons/count`, { query: params });
}

/** GET /persons – List paginated persons with optional name/email search. */
export function fetchPersons(params: {
  limit?: number;
  offset?: number;
  q?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<CrmPersonOut[]> {
  return apiFetch<CrmPersonOut[]>(`${BASE}/persons`, { query: params });
}

/** GET /project-crm-persons?project_id=X | crm_person_id=Y – List project↔person links (exactly one filter). */
export function fetchProjectCrmPersons(params: {
  project_id?: number;
  crm_person_id?: number;
}): Promise<ProjectCrmPersonOut[]> {
  return apiFetch<ProjectCrmPersonOut[]>(`${BASE}/project-crm-persons`, {
    query: params as Record<string, unknown>,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** GET /companies/{id} – Retrieve a single company by ID. */
export function getCompany(id: number): Promise<CrmCompanyOut> {
  return apiFetch<CrmCompanyOut>(`${BASE}/companies/${encodeURIComponent(id)}`);
}

/** GET /persons/{id} – Retrieve a single person by ID. */
export function getPerson(id: number): Promise<CrmPersonOut> {
  return apiFetch<CrmPersonOut>(`${BASE}/persons/${encodeURIComponent(id)}`);
}

// ── Company Merge ─────────────────────────────────────────────────────────────

/** POST /companies/{sourceId}/merge/{targetId} – Merge source company into target. */
export function mergeCompanies(sourceId: number, targetId: number): Promise<CrmCompanyOut> {
  return apiFetch<CrmCompanyOut>(
    `${BASE}/companies/${encodeURIComponent(sourceId)}/merge/${encodeURIComponent(targetId)}`,
    { method: 'POST' },
  );
}

/** PUT /companies/{id}/addresses/{id} – Update an existing address. */
export function updateAddress(
  companyId: number,
  addressId: number,
  data: CrmAddressUpdate,
): Promise<CrmAddressOut> {
  return apiFetch<CrmAddressOut>(
    `${BASE}/companies/${encodeURIComponent(companyId)}/addresses/${encodeURIComponent(addressId)}`,
    { method: 'PUT', body: data },
  );
}

/** PUT /companies/{id} – Update an existing company by ID. */
export function updateCompany(
  id: number,
  data: CrmCompanyUpdate,
): Promise<CrmCompanyOut> {
  return apiFetch<CrmCompanyOut>(`${BASE}/companies/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  });
}

/** PUT /persons/{id} – Update an existing person by ID. */
export function updatePerson(
  id: number,
  data: CrmPersonUpdate,
): Promise<CrmPersonOut> {
  return apiFetch<CrmPersonOut>(`${BASE}/persons/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: data,
  });
}
