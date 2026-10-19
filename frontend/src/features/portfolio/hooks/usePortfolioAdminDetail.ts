/**
 * usePortfolioAdminDetail – Data-Hook für die Portfolio-Admin-DetailPage.
 *
 * Lädt ein einzelnes Portfolio inkl. aller Translations (GET /portfolio/{slug}),
 * persistiert Struktur-Felder (PUT /portfolio/{slug}) und Translations
 * (PUT /portfolio/{slug}/translations/{locale}) und invalidiert nach jedem
 * Save den Query, damit die DetailPage frische Daten refetcht.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';


import type { components } from '@src/lib/types.generated';

import {
  fetchAdminPortfolioDetail,
  updatePortfolio,
  updatePortfolioTranslation,
} from '../services/portfolioService';

type PortfolioAdminOut = components['schemas']['PortfolioAdminOut'];

export interface UsePortfolioAdminDetailResult {
  /** Geladenes Portfolio inkl. aller Translations (undefined während Ladung/Fehler). */
  portfolio: PortfolioAdminOut | undefined;
  /** Ob Daten aktuell laden. */
  isLoading: boolean;
  /** Fehlermeldung vom letzten Load. */
  error: string | null;
  /** Persistiert ein Struktur-Feld (slug, year, sort, link_url, link_label). */
  handleStructureSave: (field: string, value: string) => Promise<void>;
  /** Persistiert ein Translation-Feld für eine Locale ('de' | 'en'). */
  handleTranslationSave: (locale: string, field: string, value: string) => Promise<void>;
}

/** Data-Hook für die Portfolio-Admin-DetailPage. */
export function usePortfolioAdminDetail(slug: string | undefined): UsePortfolioAdminDetailResult {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['admin-portfolio', slug], [slug]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchAdminPortfolioDetail(slug!),
    enabled: !!slug,
  });

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const handleStructureSave = useCallback(
    async (field: string, value: string) => {
      if (!slug) return;
      const payload = field === 'sort'
        ? { sort: Number(value) || 0 }
        : { [field]: value || null };
      await updatePortfolio(slug, payload);
      await invalidate();
    },
    [slug, invalidate],
  );

  const handleTranslationSave = useCallback(
    async (locale: string, field: string, value: string) => {
      if (!slug) return;
      await updatePortfolioTranslation(slug, locale, { [field]: value.trim() });
      await invalidate();
    },
    [slug, invalidate],
  );

  const errorMessage = isError
    ? (error instanceof Error ? error.message : 'Fehler beim Laden des Portfolios')
    : null;

  return {
    portfolio: data,
    isLoading,
    error: errorMessage,
    handleStructureSave,
    handleTranslationSave,
  };
}
