/**
 * useContactEnrichment – Orchestrates the "Kontaktdaten besorgen" dialog.
 *
 * Supports two modes: automatic (Hunter) and manual (without Hunter). In manual
 * mode an existing company/person can be searched and selected, or created
 * directly from the current query. Mirrors the search/persist conventions of
 * `useProjectEnrichmentStatus` (local state, service-only I/O, errors surfaced
 * via toast + state).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createCompany,
  createPerson,
  enrichProjectContacts,
  fetchCompanies,
  fetchPersons,
} from '@src/lib/api/crm';
import type { ProjectEnrichResponse } from '@src/lib/api/crm';
import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';
import type { components } from '@src/lib/types.generated';



export type ContactEnrichMode = 'auto' | 'manual';
type CrmCompanyOut = components['schemas']['CompanyOut'];

type CrmPersonOut = components['schemas']['PersonOut'];

const DASH = '\u2013';
const SEARCH_LIMIT = 7;
const DEBOUNCE_MS = 300;
const UNKNOWN_LAST_NAME = 'Unknown';

export interface UseContactEnrichmentResult {
  mode: ContactEnrichMode;
  setMode: (mode: ContactEnrichMode) => void;
  companyQuery: string;
  onCompanyQueryChange: (value: string) => void;
  personQuery: string;
  onPersonQueryChange: (value: string) => void;
  companyResults: CrmCompanyOut[];
  personResults: CrmPersonOut[];
  selectedCompany: CrmCompanyOut | null;
  selectCompany: (company: CrmCompanyOut) => void;
  selectedPerson: CrmPersonOut | null;
  selectPerson: (person: CrmPersonOut) => void;
  createCompanyFromQuery: () => void;
  createPersonFromQuery: () => void;
  loading: boolean;
  result: ProjectEnrichResponse | null;
  error: string | null;
  submit: () => void;
}

/** A prop value is treated as empty when blank or the em-dash placeholder. */
function isEmptyName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || trimmed === DASH;
}

/** Normalises a prop value to a searchable query (empty instead of em-dash). */
function toQuery(value: string): string {
  return isEmptyName(value) ? '' : value.trim();
}

/**
 * Manages search, manual selection/creation and submission for a project's
 * contact enrichment.
 *
 * @param projectId - Project to enrich.
 * @param companyName - Project's company name (em-dash treated as empty).
 * @param contactName - Project's contact name (em-dash treated as empty).
 * @param onEnriched - Called after a successful enrichment.
 */
export function useContactEnrichment(
  projectId: number,
  companyName: string,
  contactName: string,
  onEnriched?: () => void,
): UseContactEnrichmentResult {
  const [mode, setMode] = useState<ContactEnrichMode>('auto');
  const [companyQuery, setCompanyQuery] = useState(() => toQuery(companyName));
  const [personQuery, setPersonQuery] = useState(() => toQuery(contactName));
  const [companyResults, setCompanyResults] = useState<CrmCompanyOut[]>([]);
  const [personResults, setPersonResults] = useState<CrmPersonOut[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CrmCompanyOut | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<CrmPersonOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProjectEnrichResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const companyDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const personDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const searchCompanies = useCallback(
    (query: string): Promise<CrmCompanyOut[]> =>
      isEmptyName(query)
        ? Promise.resolve([])
        : fetchCompanies({ q: query.trim(), limit: SEARCH_LIMIT }),
    [],
  );

  const searchPersons = useCallback(
    (query: string): Promise<CrmPersonOut[]> =>
      isEmptyName(query)
        ? Promise.resolve([])
        : fetchPersons({ q: query.trim(), limit: SEARCH_LIMIT }),
    [],
  );

  // Existence check on open: search once so matches show as "already present".
  useEffect(() => {
    void searchCompanies(toQuery(companyName))
      .then(setCompanyResults)
      .catch(() => setCompanyResults([]));
    void searchPersons(toQuery(contactName))
      .then(setPersonResults)
      .catch(() => setPersonResults([]));
  }, [companyName, contactName, searchCompanies, searchPersons]);

  useEffect(() => () => {
    if (companyDebounceRef.current) clearTimeout(companyDebounceRef.current);
    if (personDebounceRef.current) clearTimeout(personDebounceRef.current);
  }, []);

  const onCompanyQueryChange = useCallback(
    (value: string) => {
      setCompanyQuery(value);
      setSelectedCompany(null);
      if (companyDebounceRef.current) clearTimeout(companyDebounceRef.current);
      companyDebounceRef.current = setTimeout(() => {
        void searchCompanies(value).then(setCompanyResults).catch(() => setCompanyResults([]));
      }, DEBOUNCE_MS);
    },
    [searchCompanies],
  );

  const onPersonQueryChange = useCallback(
    (value: string) => {
      setPersonQuery(value);
      setSelectedPerson(null);
      if (personDebounceRef.current) clearTimeout(personDebounceRef.current);
      personDebounceRef.current = setTimeout(() => {
        void searchPersons(value).then(setPersonResults).catch(() => setPersonResults([]));
      }, DEBOUNCE_MS);
    },
    [searchPersons],
  );

  const selectCompany = useCallback((company: CrmCompanyOut) => {
    setSelectedCompany(company);
  }, []);

  const selectPerson = useCallback((person: CrmPersonOut) => {
    setSelectedPerson(person);
  }, []);

  const createCompanyFromQuery = useCallback(() => {
    const name = companyQuery.trim();
    if (!name) return;
    void createCompany({ name })
      .then(setSelectedCompany)
      .catch((e: unknown) => {
        const msg = extractApiError(e);
        setError(msg);
        showErrorToast(`Firma anlegen fehlgeschlagen: ${msg}`);
      });
  }, [companyQuery]);

  const createPersonFromQuery = useCallback(() => {
    const name = personQuery.trim();
    if (!name) return;
    const [firstToken, ...rest] = name.split(/\s+/);
    const firstName = firstToken;
    const lastName = rest.length > 0 ? rest.join(' ') : UNKNOWN_LAST_NAME;
    // No company_domain – passing it would trigger a Hunter call.
    void createPerson({ first_name: firstName, last_name: lastName })
      .then(setSelectedPerson)
      .catch((e: unknown) => {
        const msg = extractApiError(e);
        setError(msg);
        showErrorToast(`Person anlegen fehlgeschlagen: ${msg}`);
      });
  }, [personQuery]);

  const submit = useCallback(() => {
    setLoading(true);
    setError(null);
    setResult(null);
    void enrichProjectContacts(projectId, {
      crm_company_id: selectedCompany?.id,
      crm_person_id: selectedPerson?.id,
      skip_hunter: mode === 'manual',
    })
      .then((data) => {
        setResult(data);
        onEnriched?.();
      })
      .catch((e: unknown) => {
        const msg = extractApiError(e);
        setError(msg);
        showErrorToast(`Enrichment fehlgeschlagen: ${msg}`);
      })
      .finally(() => setLoading(false));
  }, [projectId, selectedCompany, selectedPerson, mode, onEnriched]);

  return {
    mode,
    setMode,
    companyQuery,
    onCompanyQueryChange,
    personQuery,
    onPersonQueryChange,
    companyResults,
    personResults,
    selectedCompany,
    selectCompany,
    selectedPerson,
    selectPerson,
    createCompanyFromQuery,
    createPersonFromQuery,
    loading,
    result,
    error,
    submit,
  };
}
