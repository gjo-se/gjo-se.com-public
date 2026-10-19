/**
 * useApplicationFlow – loads and drives the application workflow of a project.
 *
 * Encapsulates the submission state (read-by-project, 404 ⇒ null), the list of
 * all application versions of the project and the prepare/send/setCurrent
 * mutations plus the loading/error flags. Stateless feature: all state lives
 * here, never in a global store. The mail snapshot is read-only – it is
 * generated from the application profile data.
 */
import { useCallback, useEffect, useState } from 'react';

import { extractApiError } from '@src/lib/api/extractError';

import { regenerateSubmissionCv } from '../services/applicationCvSkillService';
import {
  fetchSubmissionApplications,
  getSubmissionByProject,
  prepareSubmission,
  sendSubmission,
  setCurrentSubmission,
} from '../services/applicationService';

import type {
  ApplicationSubmissionDetailOut,
  ApplicationSubmissionListOut,
  Language,
} from '../services/applicationService';

export interface UseApplicationFlowResult {
  submission: ApplicationSubmissionDetailOut | null;
  /** All application versions of the project (current flag on each row). */
  applications: ApplicationSubmissionListOut[];
  loading: boolean;
  preparing: boolean;
  sending: boolean;
  /** Whether a manual CV re-render is currently running. */
  regenerating: boolean;
  error: string | null;
  /** Language the new submission is prepared in (default `de`). */
  language: Language;
  setLanguage: (language: Language) => void;
  refetch: () => void;
  prepare: () => Promise<void>;
  /** Sends the persisted snapshot; resolves `true` on success, `false` on error. */
  send: () => Promise<boolean>;
  /**
   * Re-renders the current submission's CV once (no skill change) and reloads
   * the submission; resolves `true` on success, `false` on error.
   *
   * `useDefaultSkills` renders the curated default skill groups instead of the
   * project's linked skills; omitted inherits the mode stored on the snapshot.
   */
  regenerateCv: (useDefaultSkills?: boolean) => Promise<boolean>;
  /** Marks the given submission as the current version and reloads the list. */
  setCurrent: (submissionId: number) => Promise<void>;
}

/**
 * Hook that loads the application submission of `projectId` and exposes the
 * prepare and send actions plus the current loading/error state.
 */
export function useApplicationFlow(projectId?: number): UseApplicationFlowResult {
  const [submission, setSubmission] = useState<ApplicationSubmissionDetailOut | null>(null);
  const [applications, setApplications] = useState<ApplicationSubmissionListOut[]>([]);
  const [loading, setLoading] = useState(projectId !== undefined);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('de');

  const load = useCallback(
    async (isCancelled?: () => boolean) => {
      if (projectId === undefined) {
        if (!isCancelled?.()) {
          setSubmission(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      if (!isCancelled?.()) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getSubmissionByProject(projectId);
        if (!isCancelled?.()) setSubmission(data);
      } catch (err: unknown) {
        if (!isCancelled?.()) setError(extractApiError(err));
      } finally {
        if (!isCancelled?.()) setLoading(false);
      }
    },
    [projectId],
  );

  const loadApplications = useCallback(async () => {
    if (projectId === undefined) {
      setApplications([]);
      return;
    }
    try {
      const data = await fetchSubmissionApplications(projectId);
      setApplications(data);
    } catch (err: unknown) {
      setError(extractApiError(err));
    }
  }, [projectId]);

  // Initial load with cancel guard.
  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    void loadApplications();
    return () => {
      cancelled = true;
    };
  }, [load, loadApplications]);

  const refetch = useCallback(() => {
    void load();
  }, [load]);

  const prepare = useCallback(async () => {
    if (projectId === undefined) return;
    setPreparing(true);
    setError(null);
    try {
      const data = await prepareSubmission(projectId, language);
      setSubmission(data);
      await loadApplications();
    } catch (err: unknown) {
      setError(extractApiError(err));
    } finally {
      setPreparing(false);
    }
  }, [projectId, loadApplications, language]);

  const send = useCallback(async (): Promise<boolean> => {
    if (!submission) return false;
    setSending(true);
    setError(null);
    try {
      const data = await sendSubmission(submission.id);
      setSubmission(data);
      return true;
    } catch (err: unknown) {
      setError(extractApiError(err));
      return false;
    } finally {
      setSending(false);
    }
  }, [submission]);

  const regenerateCv = useCallback(async (useDefaultSkills?: boolean): Promise<boolean> => {
    if (!submission || projectId === undefined) return false;
    setRegenerating(true);
    setError(null);
    try {
      await regenerateSubmissionCv(submission.id, useDefaultSkills);
      const data = await getSubmissionByProject(projectId);
      setSubmission(data);
      return true;
    } catch (err: unknown) {
      setError(extractApiError(err));
      return false;
    } finally {
      setRegenerating(false);
    }
  }, [submission, projectId]);

  const setCurrent = useCallback(
    async (submissionId: number) => {
      setError(null);
      try {
        const data = await setCurrentSubmission(submissionId);
        setSubmission(data);
        await loadApplications();
      } catch (err: unknown) {
        setError(extractApiError(err));
      }
    },
    [loadApplications],
  );

  return {
    submission,
    applications,
    loading,
    preparing,
    sending,
    regenerating,
    error,
    language,
    setLanguage,
    refetch,
    prepare,
    send,
    regenerateCv,
    setCurrent,
  };
}
