/**
 * useExperienceTable – Data hook for the experience projects admin table.
 *
 * Loads all experience projects via TanStack Query (BE sorts by `sort` ASC)
 * and exposes create/update/delete/reorder mutations. Every write invalidates
 * the list query and reports its outcome via a toast.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';


import {
  createExperience,
  deleteExperience,
  listExperiences,
  reorderExperiences,
  updateExperience,
} from '@src/lib/api/applicationProfile';
import type {
  ExperienceCreate,
  ExperienceOut,
  ExperienceUpdate,
} from '@src/lib/api/applicationProfile';
import { showErrorToast } from '@src/lib/errorToast';

export interface UseExperienceTableResult {
  /** All experience projects (server-side sorted by `sort` ASC). */
  experiences: ExperienceOut[];
  loading: boolean;
  error: string | null;
  /** Forces a refetch of the experience list. */
  reload: () => Promise<void>;
  /** Creates a new experience project. */
  create: (data: ExperienceCreate) => Promise<void>;
  /** Updates an existing experience project. */
  update: (id: number, data: ExperienceUpdate) => Promise<void>;
  /** Deletes an experience project by id. */
  remove: (id: number) => Promise<void>;
  /** Persists the new order via `ordered_ids`. */
  reorder: (orderedIds: number[]) => Promise<void>;
}

const QUERY_KEY = ['experiences'] as const;

/** Extracts a human-readable message from an unknown error. */
function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Data hook for the experience projects admin table (list + mutations).
 */
export function useExperienceTable(): UseExperienceTableResult {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listExperiences,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient],
  );

  const createMutation = useMutation({ mutationFn: createExperience });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: payload }: { id: number; data: ExperienceUpdate }) =>
      updateExperience(id, payload),
  });

  const deleteMutation = useMutation({ mutationFn: deleteExperience });

  const reorderMutation = useMutation({ mutationFn: reorderExperiences });

  const reload = useCallback(async (): Promise<void> => {
    await invalidate();
  }, [invalidate]);

  const create = useCallback(
    async (payload: ExperienceCreate): Promise<void> => {
      try {
        await createMutation.mutateAsync(payload);
        await invalidate();
        toast.success('Erfahrung angelegt.');
      } catch (err) {
        showErrorToast(toMessage(err, 'Fehler beim Anlegen.'));
      }
    },
    [createMutation, invalidate],
  );

  const update = useCallback(
    async (id: number, payload: ExperienceUpdate): Promise<void> => {
      try {
        await updateMutation.mutateAsync({ id, data: payload });
        await invalidate();
        toast.success('Erfahrung gespeichert.');
      } catch (err) {
        showErrorToast(toMessage(err, 'Fehler beim Speichern.'));
      }
    },
    [updateMutation, invalidate],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(id);
        await invalidate();
        toast.success('Erfahrung gelöscht.');
      } catch (err) {
        showErrorToast(toMessage(err, 'Fehler beim Löschen.'));
      }
    },
    [deleteMutation, invalidate],
  );

  const reorder = useCallback(
    async (orderedIds: number[]): Promise<void> => {
      try {
        await reorderMutation.mutateAsync(orderedIds);
        await invalidate();
      } catch (err) {
        showErrorToast(toMessage(err, 'Fehler beim Sortieren.'));
      }
    },
    [reorderMutation, invalidate],
  );

  const experiences = useMemo(() => data ?? [], [data]);

  return {
    experiences,
    loading: isLoading,
    error: isError ? toMessage(error, 'Fehler beim Laden.') : null,
    reload,
    create,
    update,
    remove,
    reorder,
  };
}
