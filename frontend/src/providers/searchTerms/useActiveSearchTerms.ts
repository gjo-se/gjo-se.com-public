/**
 * Hook: useActiveSearchTerms
 *
 * Lädt alle aktiven SearchTerms vom öffentlichen FBF-Endpunkt.
 * Verwendet für den Filter-Dropdown in Admin-Tabellen.
 */

import { useEffect, useState } from 'react';

import { fetchActiveSearchTerms, type SearchTerm } from '@src/lib/api/searchTerms';

interface UseActiveSearchTermsResult {
  searchTerms: SearchTerm[]
  loading: boolean
  error: string | null
}

/**
 * Lädt aktive SearchTerms (active = true) vom Backend.
 *
 * @returns searchTerms – Liste aktiver Suchbegriffe, loading – Ladestatus, error – Fehlermeldung
 */
export function useActiveSearchTerms(): UseActiveSearchTermsResult {
  const [searchTerms, setSearchTerms] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchActiveSearchTerms()
      .then((data) => {
        if (!cancelled) {
          setSearchTerms(data);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Fehler beim Laden der Suchbegriffe.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { searchTerms, loading, error };
}
