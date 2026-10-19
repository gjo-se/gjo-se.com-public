/**
 * Technology Catalog API-Service – typisierte API-Funktionen für die Admin-UI.
 *
 * Alle Endpunkte erfordern ein gültiges JWT-Cookie mit role='admin'.
 * Nutzt den gemeinsamen `apiFetch`-Helper (siehe `@src/lib/api/apiFetch`).
 */
import { apiFetch } from '@src/lib/api/apiFetch';

import type { TechnologyCatalogEntry, TechnologyCatalogParams, TechnologyListCount } from './technologyCatalogTypes';

const BASE = '/api/v1/admin/technology-catalog';

// ── Public API ─────────────────────────────────────────────────────────────────

/** GET /models/count/icons – Total/loaded/missing icon stats. */
export function fetchIconCounts(): Promise<{ total: number; loaded: number; missing: number }> {
  return apiFetch<{ total: number; loaded: number; missing: number }>(
    `${BASE}/models/count/icons`,
  );
}

/** GET /models – Paginated, filterable technology list. */
export function fetchTechnologies(
  params: TechnologyCatalogParams = {},
): Promise<TechnologyCatalogEntry[]> {
  return apiFetch<TechnologyCatalogEntry[]>(`${BASE}/models`, {
    query: params as Record<string, unknown>,
  });
}

// ── Internal Helpers ───────────────────────────────────────────────────────────

/** GET /models/count – Total count matching filters. */
export async function fetchTechnologyCount(
  params: Pick<TechnologyCatalogParams, 'q' | 'provider' | 'type' | 'status'> = {},
): Promise<number> {
  const data = await apiFetch<TechnologyListCount>(`${BASE}/models/count`, {
    query: params as Record<string, unknown>,
  });
  return data.total;
}

/** PATCH /models/{id} – Partially update a technology entry. */
export function updateTechnology(
  id: number,
  data: Partial<
    Pick<
      TechnologyCatalogEntry,
      'name' | 'provider' | 'type' | 'color_token' | 'status' | 'slug' | 'viscera_restrictions' | 'description'
    >
  >,
): Promise<TechnologyCatalogEntry> {
  return apiFetch<TechnologyCatalogEntry>(`${BASE}/models/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: data,
  });
}
