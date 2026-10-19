/**
 * useContactSubmissionTable – Data-Hook für die Admin-Kontakt-Inbox.
 *
 * Lädt alle Submissions (neueste zuerst) per TanStack Query und stellt eine
 * Delete-Mutation bereit, die nach erfolgreichem Löschen den Query invalidiert,
 * sodass die Tabelle automatisch aktualisiert wird.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  deleteContactSubmission,
  listContactSubmissions,
} from '../services/contactService';

import type { ContactSubmissionOut } from '../services/contactService';

export interface UseContactSubmissionTableReturn {
  submissions: ContactSubmissionOut[];
  loading: boolean;
  error: string | null;
  /** Löscht eine Submission; gibt bei Fehler eine deutsche Meldung zurück. */
  handleDelete: (id: number) => Promise<string | null>;
}

const QUERY_KEY = ['contact-submissions'] as const;

function toError(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Data-Hook für die Admin-Kontakt-Inbox (Liste + Löschen).
 */
export function useContactSubmissionTable(): UseContactSubmissionTableReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: listContactSubmissions,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient],
  );

  const deleteMutation = useMutation({
    mutationFn: deleteContactSubmission,
  });

  const handleDelete = useCallback(
    async (id: number): Promise<string | null> => {
      try {
        await deleteMutation.mutateAsync(id);
        await invalidate();
        return null;
      } catch (err) {
        return toError(err, 'Fehler beim Löschen.');
      }
    },
    [deleteMutation, invalidate],
  );

  const submissions = useMemo(() => data ?? [], [data]);

  return {
    submissions,
    loading: isLoading,
    error: isError ? toError(error, 'Fehler beim Laden.') : null,
    handleDelete,
  };
}
