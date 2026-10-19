/**
 * usePortfolioAdminTable – Data-fetching-Hook für die Portfolio-Admin-Liste.
 *
 * Lädt ALLE Projekte (server-seitig sortiert nach `sort` ASC) für die
 * DnD-Tabelle. Die Reihenfolge wird ausschließlich per Drag&Drop gepflegt
 * (PATCH /reorder, index = sort) – eine sichtbare Sort-Spalte gibt es nicht.
 * Suchbegriffe werden debounced an den Backend-`q`-Parameter weitergegeben.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { components } from '@src/lib/types.generated';
import { routeConfig } from '@src/router.config';

import {
  createPortfolio,
  deletePortfolio,
  fetchAdminPortfolios,
  reorderPortfolios,
} from '../services/portfolioService';

type PortfolioAdminOut = components['schemas']['PortfolioAdminOut'];

// ── Types ─────────────────────────────────────────────────────────────────────

/** Row-Type für die Portfolio-Admin-Liste (angezeigte, flache Felder). */
export interface PortfolioAdminRow {
  /** Numerische ID – Basis für die Status-Zuordnung (statusable). */
  id: number;
  slug: string;
  /** DE-Titel mit EN-Fallback (Translation-Table-Pattern). */
  title: string;
  /** DE-Sub-Titel mit EN-Fallback (Translation-Table-Pattern). */
  sub_title: string;
  /** Status-Name via core_statusable (z.B. 'active'/'inactive'). */
  status?: string | null;
  /** Color-Token des Status (z.B. 'green'/'gray'). */
  status_color_token?: string | null;
}

export interface UsePortfolioAdminTableResult {
  /** Alle Projekte sortiert nach `sort` aufsteigend. */
  portfolios: PortfolioAdminRow[];
  /** Alle geladenen Slugs für Prev/Next-Navigation auf der DetailPage. */
  allIds: string[];
  /** Ob Daten aktuell laden. */
  isLoading: boolean;
  /** Fehlermeldung vom letzten Load. */
  error: string | null;
  /** Aktiver Suchbegriff. */
  search: string;
  /** Setzt den Suchbegriff (debounced → Backend-q). */
  onSearchChange: (value: string) => void;
  /** Persistiert die neue Reihenfolge per ordered_slugs. */
  handleReorder: (orderedSlugs: string[]) => Promise<string | null>;
  /** Löscht ein Projekt per slug. */
  handleDelete: (slug: string) => Promise<string | null>;
  /** Navigiert zur DetailPage (mit allIds für Prev/Next). */
  handleEdit: (row: PortfolioAdminRow) => void;
  /** Legt ein neues Projekt an (slug; DE-Titel leer). */
  onGhostCreate: (data: Record<string, string>) => Promise<string | null>;
}

/** Mappt das Backend-DTO auf die flache Row-Darstellung (DE, EN-Fallback). */
function mapRow(p: PortfolioAdminOut): PortfolioAdminRow {
  const de = p.translations?.['de'];
  const en = p.translations?.['en'];
  const title = de?.title || en?.title || '–';
  const subTitle = de?.sub_title || en?.sub_title || '–';
  return {
    id: p.id,
    slug: p.slug,
    title,
    sub_title: subTitle,
    status: p.status,
    status_color_token: p.status_color_token,
  };
}

/** Extrahiert eine deutsche Fehlermeldung aus einem unbekannten Fehler. */
function toError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/** Data-Hook für die DnD-fähige Portfolio-Admin-Liste. */
export function usePortfolioAdminTable(): UsePortfolioAdminTableResult {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const queryKey = useMemo(() => ['admin-portfolio-list', debouncedSearch] as const, [debouncedSearch]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchAdminPortfolios({
        sort_by: 'sort',
        sort_order: 'asc',
        limit: 5000,
        q: debouncedSearch.trim() || undefined,
      }),
  });

  const portfolios = useMemo(() => (data ? data.map(mapRow) : []), [data]);
  const allIds = useMemo(() => (data ? data.map((p) => p.slug) : []), [data]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey }),
    [queryClient, queryKey],
  );

  const handleReorder = useCallback(
    async (orderedSlugs: string[]): Promise<string | null> => {
      try {
        await reorderPortfolios(orderedSlugs);
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Sortieren.');
      }
    },
    [invalidate],
  );

  const handleDelete = useCallback(
    async (slug: string): Promise<string | null> => {
      try {
        await deletePortfolio(slug);
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Löschen.');
      }
    },
    [invalidate],
  );

  const handleEdit = useCallback(
    (row: PortfolioAdminRow) => {
      const from = `${window.location.pathname}${window.location.search}`;
      navigate(routeConfig.adminPortfolioDetail.path.replace(':slug', row.slug), {
        state: { from, allIds },
      });
    },
    [navigate, allIds],
  );

  const onGhostCreate = useCallback(
    async (data: Record<string, string>): Promise<string | null> => {
      const slug = String(data.slug ?? '').trim();
      if (!slug) return 'Slug ist erforderlich.';
      try {
        await createPortfolio({
          slug,
          sort: 0,
          translations: { de: { title: '' } },
        });
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Anlegen.');
      }
    },
    [invalidate],
  );

  return {
    portfolios,
    allIds,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : 'Fehler beim Laden.') : null,
    search,
    onSearchChange: setSearch,
    handleReorder,
    handleDelete,
    handleEdit,
    onGhostCreate,
  };
}
