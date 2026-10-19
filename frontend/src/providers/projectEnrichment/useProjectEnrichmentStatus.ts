/**
 * useProjectEnrichmentStatus – Reports whether a project is already linked to
 * at least one CRM person (i.e. already enriched) and, if so, resolves the
 * linked CRM person and company IDs for deep-linking.
 *
 * Fetches the project↔person links for the given project and treats a
 * non-empty result as enriched. Errors are swallowed – the status simply
 * stays false so the enrich action remains available.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchProjectCrmPersons, getPerson } from '@src/lib/api/crm';

interface EnrichmentState {
  /** Project the state was loaded for; guards against stale results. */
  id: number | null;
  enriched: boolean;
  /** Primary project↔person link id (used to replace the link), if any. */
  linkId: number | null;
  /** Linked CRM company id (via person → address → company), if any. */
  companyId: number | null;
  /** Linked CRM company name (via person → address → company), if any. */
  companyName: string | null;
  /** Linked CRM person id, if any. */
  personId: number | null;
  /** Linked person's display name (first + last), if resolvable. */
  personName: string | null;
  /** Linked person's real email; null when Hunter did not resolve one. */
  personEmail: string | null;
  /** Generic email of the linked company (fallback); null when none is set. */
  companyEmail: string | null;
}

const EMPTY: Omit<EnrichmentState, 'id'> = {
  enriched: false,
  linkId: null,
  companyId: null,
  companyName: null,
  personId: null,
  personName: null,
  personEmail: null,
  companyEmail: null,
};

export interface UseProjectEnrichmentStatusResult {
  /** True when the project has ≥1 project↔person link. */
  enriched: boolean;
  /** Primary project↔person link id (the one shown/edited), or null. */
  linkId: number | null;
  /** Linked CRM company id, resolved via the linked person's address. */
  companyId: number | null;
  /** Linked CRM company name, resolved via the linked person's address. */
  companyName: string | null;
  /** Linked CRM person id. */
  personId: number | null;
  /** Linked person's display name (first + last), or null. */
  personName: string | null;
  /** Linked person's real email, or null when none is known. */
  personEmail: string | null;
  /** Generic email of the linked company (send fallback), or null. */
  companyEmail: string | null;
  /** Re-fetch the enrichment status (e.g. after a successful enrichment). */
  refetch: () => void;
}

/** Returns whether the given project is already enriched with a CRM person. */
export function useProjectEnrichmentStatus(projectId?: number): UseProjectEnrichmentStatusResult {
  const [state, setState] = useState<EnrichmentState>({ id: null, ...EMPTY });

  const load = useCallback(async (id: number): Promise<Omit<EnrichmentState, 'id'>> => {
    try {
      const links = await fetchProjectCrmPersons({ project_id: id });
      if (links.length === 0) return EMPTY;

      // The project has exactly one primary contact; fall back to the first link.
      const link = links.find((l) => l.label === 'primary') ?? links[0];
      const personId = link.crm_person_id;
      let companyId: number | null = null;
      let companyName: string | null = null;
      let personName: string | null = null;
      let personEmail: string | null = null;
      let companyEmail: string | null = null;
      try {
        const person = await getPerson(personId);
        companyId = person.primary_company_id ?? null;
        companyName = person.primary_company_name ?? null;
        personName = [person.first_name, person.last_name].filter(Boolean).join(' ') || null;
        personEmail = person.email ?? null;
        companyEmail = person.primary_company_email ?? null;
      } catch {
        // Person lookup failed – the link is still usable.
      }
      return {
        enriched: true,
        linkId: link.id,
        companyId,
        companyName,
        personId,
        personName,
        personEmail,
        companyEmail,
      };
    } catch {
      // Status stays empty on error – enrichment stays available.
      return EMPTY;
    }
  }, []);

  const refetch = useCallback(() => {
    if (projectId == null) return;
    void load(projectId).then((value) => setState({ id: projectId, ...value }));
  }, [projectId, load]);

  useEffect(() => {
    if (projectId == null) return;
    let cancelled = false;
    void load(projectId).then((value) => {
      if (!cancelled) setState({ id: projectId, ...value });
    });
    return () => { cancelled = true; };
  }, [projectId, load]);

  const active = projectId != null && state.id === projectId;

  return {
    enriched: active ? state.enriched : false,
    linkId: active ? state.linkId : null,
    companyId: active ? state.companyId : null,
    companyName: active ? state.companyName : null,
    personId: active ? state.personId : null,
    personName: active ? state.personName : null,
    personEmail: active ? state.personEmail : null,
    companyEmail: active ? state.companyEmail : null,
    refetch,
  };
}
