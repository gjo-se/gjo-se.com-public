import { useQuery } from '@tanstack/react-query';

import { useLocaleApi } from '@src/hooks/useLocaleApi';

import { usePortfolioService } from './usePortfolioService';

import type { ProjectChainPhase } from '../core/types';

interface UseHomeFocusCardsResult {
  phases: ProjectChainPhase[]
  loading: boolean
  error: boolean
}

/**
 * useHomeFocusCards – speist die Home-Focus-Kette aus der Portfolio-DB (SSOT).
 *
 * Reihenfolge = `sort` der Public-Liste (Server liefert bereits sortiert); pro Eintrag
 * Nummer (Index, 01/02/03), Slug (Link-Ziel), Titel (`title`), Metapher (`sub_title`)
 * und Beschreibung (`teaser`, Fallback `impact_summary`). Kein `site_content` für die
 * Karteninhalte.
 */
export function useHomeFocusCards(limit = 3): UseHomeFocusCardsResult {
  const { locale } = useLocaleApi();
  const { listPortfolios } = usePortfolioService();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['home-focus-cards', locale],
    queryFn: listPortfolios,
    staleTime: 5 * 60 * 1000,
  });

  const phases = (data ?? []).slice(0, limit).map((project, index) => ({
    num: String(index + 1).padStart(2, '0'),
    slug: project.slug,
    title: project.title,
    subTitle: project.sub_title ?? undefined,
    description: project.teaser ?? project.impact_summary ?? '',
  }));

  return { phases, loading: isLoading, error: isError };
}
