/**
 * portfolioService – Typisierte Admin-API-Funktionen für Portfolio-Projekte.
 *
 * Endpunkte (Admin, erfordert JWT mit role='admin'):
 *   GET    /admin/portfolio          – Paginierte Liste (q, offset, limit, sort_by, sort_order)
 *   GET    /admin/portfolio/count     – Gesamtzahl (q)
 *   GET    /admin/portfolio/{slug}    – Einzelnes Projekt mit Translations
 *   POST   /admin/portfolio           – Projekt + Translations anlegen
 *   PUT    /admin/portfolio/{slug}    – Projekt partiell aktualisieren
 *   PUT    /admin/portfolio/{slug}/translations/{locale} – Translation partiell aktualisieren
 *   DELETE /admin/portfolio/{slug}    – Projekt löschen
 *
 * Proofs (1:N-Beweise, Sub-Resource):
 *   GET    /admin/portfolio/{slug}/proofs            – Alle Proofs inkl. Statements
 *   POST   /admin/portfolio/{slug}/proofs            – Proof + Statements anlegen (201)
 *   PUT    /admin/portfolio/{slug}/proofs/{id}       – Proof partiell aktualisieren
 *   DELETE /admin/portfolio/{slug}/proofs/{id}       – Proof löschen (204)
 *   PATCH  /admin/portfolio/{slug}/proofs/reorder    – sort aus ordered_ids setzen
 *
 * Nutzt den gemeinsamen `apiFetch`-Helper (siehe `@src/lib/api/apiFetch`).
 */
import { apiFetch } from '@src/lib/api/apiFetch';
import type { AssetInfo } from '@src/lib/api/assetTypes';
import type { components } from '@src/lib/types.generated';


// ── Type aliases aus generierten OpenAPI-Types ─────────────────────────────────

type LocaleFields = components['schemas']['LocaleFieldsOut'];
type PortfolioAdminCreate = components['schemas']['PortfolioAdminCreate'];
type PortfolioAdminOut = components['schemas']['PortfolioAdminOut'];
type PortfolioAdminUpdate = components['schemas']['PortfolioAdminUpdate'];
type ProofAdminOut = components['schemas']['ProofAdminOut'];
type ProofCreate = components['schemas']['ProofCreate'];
type ProofUpdate = components['schemas']['ProofUpdate'];

const BASE = '/api/v1/admin/portfolio';

/** POST /admin/portfolio – Neues Projekt mit Translations anlegen. */
export function createPortfolio(data: PortfolioAdminCreate): Promise<PortfolioAdminOut> {
  return apiFetch<PortfolioAdminOut>(BASE, { method: 'POST', body: data });
}

/** POST /admin/portfolio/{slug}/proofs – Neuen Proof inkl. Statements anlegen. */
export function createPortfolioProof(
  slug: string,
  data: ProofCreate,
): Promise<ProofAdminOut> {
  return apiFetch<ProofAdminOut>(`${BASE}/${encodeURIComponent(slug)}/proofs`, {
    method: 'POST',
    body: data,
  });
}

/** DELETE /admin/portfolio/{slug} – Projekt löschen (204). */
export function deletePortfolio(slug: string): Promise<void> {
  return apiFetch<void>(`${BASE}/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

/** DELETE /admin/portfolio/{slug}/proofs/{id} – Proof löschen (204). */
export function deletePortfolioProof(slug: string, proofId: number): Promise<void> {
  return apiFetch<void>(`${BASE}/${encodeURIComponent(slug)}/proofs/${proofId}`, {
    method: 'DELETE',
  });
}

/** GET /admin/portfolio/{slug} – Einzelnes Projekt inkl. aller Translations. */
export function fetchAdminPortfolioDetail(slug: string): Promise<PortfolioAdminOut> {
  return apiFetch<PortfolioAdminOut>(`${BASE}/${encodeURIComponent(slug)}`);
}

/** GET /admin/portfolio – Paginierte Liste mit optionaler Suche. */
export function fetchAdminPortfolios(params: {
  limit?: number;
  offset?: number;
  q?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<PortfolioAdminOut[]> {
  return apiFetch<PortfolioAdminOut[]>(BASE, { query: params });
}

/** GET /admin/portfolio/{slug}/proofs – Alle Proofs inkl. aller Statements. */
export function fetchPortfolioProofs(slug: string): Promise<ProofAdminOut[]> {
  return apiFetch<ProofAdminOut[]>(`${BASE}/${encodeURIComponent(slug)}/proofs`);
}

/** GET /admin/portfolio/assets?prefix= – Liste der ObjectStore-Assets (Datei-Picker). */
export function listPortfolioAssets(prefix = ''): Promise<AssetInfo[]> {
  return apiFetch<AssetInfo[]>(`${BASE}/assets`, { query: { prefix } });
}

/** PATCH /admin/portfolio/{slug}/proofs/reorder – sort aus ordered_ids setzen. */
export function reorderPortfolioProofs(
  slug: string,
  orderedIds: number[],
): Promise<ProofAdminOut[]> {
  return apiFetch<ProofAdminOut[]>(`${BASE}/${encodeURIComponent(slug)}/proofs/reorder`, {
    method: 'PATCH',
    body: { ordered_ids: orderedIds },
  });
}

/** PATCH /admin/portfolio/reorder – sort aus ordered_slugs setzen. */
export function reorderPortfolios(orderedSlugs: string[]): Promise<PortfolioAdminOut[]> {
  return apiFetch<PortfolioAdminOut[]>(`${BASE}/reorder`, {
    method: 'PATCH',
    body: { ordered_slugs: orderedSlugs },
  });
}

/** PUT /admin/portfolio/{slug} – Projekt partiell aktualisieren (Inline-Edit). */
export function updatePortfolio(
  slug: string,
  data: PortfolioAdminUpdate,
): Promise<PortfolioAdminOut> {
  return apiFetch<PortfolioAdminOut>(`${BASE}/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: data,
  });
}

/** PUT /admin/portfolio/{slug}/proofs/{id} – Proof partiell aktualisieren (image_src/statements). */
export function updatePortfolioProof(
  slug: string,
  proofId: number,
  data: ProofUpdate,
): Promise<ProofAdminOut> {
  return apiFetch<ProofAdminOut>(
    `${BASE}/${encodeURIComponent(slug)}/proofs/${proofId}`,
    { method: 'PUT', body: data },
  );
}

/** PUT /admin/portfolio/{slug}/translations/{locale} – Translation partiell aktualisieren. */
export function updatePortfolioTranslation(
  slug: string,
  locale: string,
  fields: Partial<LocaleFields>,
): Promise<PortfolioAdminOut> {
  return apiFetch<PortfolioAdminOut>(
    `${BASE}/${encodeURIComponent(slug)}/translations/${encodeURIComponent(locale)}`,
    { method: 'PUT', body: fields },
  );
}
