/**
 * useSubmissionDetail – loads and mutates a single application submission.
 *
 * Encapsulates the read-by-id state plus the status and communication-log
 * mutations. Stateless feature: all state lives here, never in a global store.
 */
import { useCallback, useEffect, useState } from 'react';

import { extractApiError } from '@src/lib/api/extractError';
import { showErrorToast } from '@src/lib/errorToast';

import {
  createSubmissionCommunication,
  deleteSubmission,
  deleteSubmissionCommunication,
  getSubmission,
  updateSubmissionCommunication,
  updateSubmissionStatus,
} from '../services/applicationService';

import type {
  ApplicationCommunicationCreate,
  ApplicationCommunicationUpdate,
  ApplicationSubmissionDetailOut,
} from '../services/applicationService';

export interface UseSubmissionDetailResult {
  /** The loaded submission, or null while unloaded / not found. */
  submission: ApplicationSubmissionDetailOut | null;
  /** Whether the initial load is still running (derived, no extra state). */
  loading: boolean;
  /** Readable error message of the last load, or null. */
  error: string | null;
  /** Reloads the submission silently (no spinner) after a mutation. */
  refetch: () => Promise<void>;
  /** Sets the lifecycle status; rejects on illegal transitions (409). */
  updateStatus: (status: string) => Promise<void>;
  /** Appends a communication entry and refreshes the submission. */
  createCommunication: (body: ApplicationCommunicationCreate) => Promise<void>;
  /** Updates an existing communication entry and refreshes the submission. */
  updateCommunication: (
    commId: number,
    patch: ApplicationCommunicationUpdate,
  ) => Promise<void>;
  /** Deletes a communication entry and refreshes the submission. */
  deleteCommunication: (commId: number) => Promise<void>;
  /**
   * Deletes the whole submission incl. its artifacts (documents, history,
   * status link); resolves `true` on success, `false` on error.
   */
  removeSubmission: () => Promise<boolean>;
}

/**
 * Hook that loads the application submission of `submissionId` and exposes the
 * status/communication mutations plus the current loading/error state.
 */
export function useSubmissionDetail(
  submissionId: number,
): UseSubmissionDetailResult {
  const [submission, setSubmission] =
    useState<ApplicationSubmissionDetailOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived loading: no data yet, no error, and a valid id.
  const loading = submission === null && error === null && submissionId !== 0;

  // Silent refetch – used after mutations (never during initial load).
  const apply = useCallback(async () => {
    try {
      const data = await getSubmission(submissionId);
      setSubmission(data);
      setError(null);
    } catch (err: unknown) {
      setError(extractApiError(err));
    }
  }, [submissionId]);

  // Initial load with cancel guard.
  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;
    getSubmission(submissionId)
      .then((data) => {
        if (cancelled) return;
        setSubmission(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(extractApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const refetch = useCallback(async () => {
    await apply();
  }, [apply]);

  const updateStatus = useCallback(
    async (status: string) => {
      const data = await updateSubmissionStatus(submissionId, status);
      setSubmission(data);
    },
    [submissionId],
  );

  const createCommunication = useCallback(
    async (body: ApplicationCommunicationCreate) => {
      await createSubmissionCommunication(submissionId, body);
      await apply();
    },
    [submissionId, apply],
  );

  const updateCommunication = useCallback(
    async (commId: number, patch: ApplicationCommunicationUpdate) => {
      await updateSubmissionCommunication(commId, patch);
      await apply();
    },
    [apply],
  );

  const deleteCommunication = useCallback(
    async (commId: number) => {
      await deleteSubmissionCommunication(commId);
      await apply();
    },
    [apply],
  );

  const removeSubmission = useCallback(async (): Promise<boolean> => {
    try {
      await deleteSubmission(submissionId);
      return true;
    } catch (err: unknown) {
      showErrorToast(`Löschen fehlgeschlagen: ${extractApiError(err)}`);
      return false;
    }
  }, [submissionId]);

  return {
    submission,
    loading,
    error,
    refetch,
    updateStatus,
    createCommunication,
    updateCommunication,
    deleteCommunication,
    removeSubmission,
  };
}
