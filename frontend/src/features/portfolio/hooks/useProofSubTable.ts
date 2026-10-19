/**
 * useProofSubTable – Data-Hook für die ProofSubTable (CRUD + Reorder + Inline-Edit).
 *
 * Lädt die 1:N-Beweise eines Portfolio-Projekts (GET /portfolio/{slug}/proofs).
 * Der Admin-Endpunkt liefert für jeden Proof alle lokalisierten Statements als
 * dict (statements[locale]); `locale` steuert daher NUR die Anzeige-/Editierview,
 * nicht den Fetch. Persistiert:
 *   - create   → POST   /proofs (statements werden für de+en mit demselben Wert befüllt,
 *                              da das Backend mind. ein de-Statement verlangt)
 *   - delete   → DELETE /proofs/{id}
 *   - image_src → PUT   /proofs/{id} (image_src)
 *   - statement → PUT  /proofs/{id} (statements, vorhandene Locales beibehalten)
 *   - question  → PUT  /proofs/{id} (questions, vorhandene Locales beibehalten)
 *   - priority  → PUT  /proofs/{id} (priority)
 *   - reorder  → PATCH  /proofs/reorder (ordered_ids)
 * Nach jedem Save wird der Query invalidiert, damit die Tabelle frische Daten refetcht.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type { components } from '@src/lib/types.generated';

import {
  createPortfolioProof,
  deletePortfolioProof,
  fetchPortfolioProofs,
  reorderPortfolioProofs,
  updatePortfolioProof,
} from '../services/portfolioService';

type ProofAdminOut = components['schemas']['ProofAdminOut'];

export interface UseProofSubTableResult {
  /** Proofs sortiert nach `sort` aufsteigend. */
  proofs: ProofAdminOut[];
  /** Ob Daten aktuell laden. */
  isLoading: boolean;
  /** Fehlermeldung vom letzten Load. */
  error: string | null;
  /** Legt einen neuen Proof an (image_src + Statement für beide Locales). */
  handleCreate: (data: { image_src?: string; statement: string; priority?: string }) => Promise<string | null>;
  /** Löscht einen Proof per id. */
  handleDelete: (proofId: number) => Promise<void>;
  /** Editiert ein Struktur-Feld (image_src, priority) per id. */
  handleInlineEdit: (proofId: number, field: string, value: string) => Promise<string | null>;
  /** Speichert das Statement der aktuellen Locale eines Proofs. */
  handleStatementSave: (proof: ProofAdminOut, statement: string) => Promise<string | null>;
  /** Speichert die Vertrauensfrage der aktuellen Locale eines Proofs. */
  handleQuestionSave: (proof: ProofAdminOut, question: string) => Promise<string | null>;
  /** Persistiert die neue Reihenfolge per ordered_ids. */
  handleReorder: (orderedIds: number[]) => Promise<string | null>;
}

/** Orchestriert Proof-Daten: Fetch, Create, Delete, Inline-Edit, Reorder. */
export function useProofSubTable(slug: string, locale: 'de' | 'en'): UseProofSubTableResult {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['admin-portfolio-proofs', slug] as const, [slug]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchPortfolioProofs(slug),
    enabled: !!slug,
  });

  const proofs = useMemo((): ProofAdminOut[] => {
    if (!data) return [];
    return [...data].sort((a, b) => a.sort - b.sort);
  }, [data]);

  const invalidate = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  /** Extrahiert eine deutsche Fehlermeldung aus einem unbekannten Fehler. */
  const toError = useCallback((err: unknown, fallback: string): string => {
    return err instanceof Error ? err.message : fallback;
  }, []);

  const handleCreate = useCallback(
    async (input: { image_src?: string; statement: string; priority?: string }): Promise<string | null> => {
      try {
        // Backend verlangt mind. ein de-Statement → beide Locales mit gleichem Wert befüllen.
        await createPortfolioProof(slug, {
          image_src: input.image_src?.trim() || null,
          statements: { de: input.statement, en: input.statement },
          priority: (input.priority as 'high' | 'medium' | undefined) || 'medium',
        });
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Anlegen des Proofs.');
      }
    },
    [slug, invalidate, toError],
  );

  const handleDelete = useCallback(
    async (proofId: number): Promise<void> => {
      try {
        await deletePortfolioProof(slug, proofId);
        await invalidate();
      } catch {
        // Fehler im Delete-Dialog still schlucken; die Tabelle refetcht unverändert.
      }
    },
    [slug, invalidate],
  );

  const handleInlineEdit = useCallback(
    async (proofId: number, field: string, value: string): Promise<string | null> => {
      if (field === 'image_src') {
        try {
          await updatePortfolioProof(slug, proofId, { image_src: value.trim() || null });
          await invalidate();
          return null;
        } catch (err) {
          return toError(err, 'Fehler beim Speichern.');
        }
      }
      if (field === 'priority') {
        try {
          await updatePortfolioProof(slug, proofId, {
            priority: value as 'high' | 'medium',
          });
          await invalidate();
          return null;
        } catch (err) {
          return toError(err, 'Fehler beim Speichern.');
        }
      }
      return null;
    },
    [slug, invalidate, toError],
  );

  const handleStatementSave = useCallback(
    async (proof: ProofAdminOut, statement: string): Promise<string | null> => {
      try {
        // Vorhandene Locales beibehalten, nur die aktuelle Locale überschreiben.
        await updatePortfolioProof(slug, proof.id, {
          statements: { ...proof.statements, [locale]: statement },
        });
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Speichern.');
      }
    },
    [slug, locale, invalidate, toError],
  );

  const handleQuestionSave = useCallback(
    async (proof: ProofAdminOut, question: string): Promise<string | null> => {
      try {
        // Vorhandene Fragen beibehalten, nur die aktuelle Locale überschreiben.
        await updatePortfolioProof(slug, proof.id, {
          questions: { ...proof.questions, [locale]: question },
        });
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Speichern.');
      }
    },
    [slug, locale, invalidate, toError],
  );

  const handleReorder = useCallback(
    async (orderedIds: number[]): Promise<string | null> => {
      try {
        await reorderPortfolioProofs(slug, orderedIds);
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Sortieren.');
      }
    },
    [slug, invalidate, toError],
  );

  return {
    proofs,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : 'Fehler beim Laden der Proofs.') : null,
    handleCreate,
    handleDelete,
    handleInlineEdit,
    handleReorder,
    handleStatementSave,
    handleQuestionSave,
  };
}
