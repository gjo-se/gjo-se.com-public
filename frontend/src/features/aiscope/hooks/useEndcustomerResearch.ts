/** Hook for endcustomer research workflow — trigger, poll, load candidates, confirm/reject. */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { showTaskProgress } from '@src/components/molecules/TaskProgressToast/TaskProgressToast.logic';
import {
  getProjectEndcustomerCandidates,
  postConfirmCandidate,
  postRejectCandidate,
  type EndcustomerCandidate,
} from '@src/lib/api/aiscopeEndcustomer';
import { postResearchEndcustomer } from '@src/lib/api/aiscopeTasks';
import { useTaskProgress } from '@src/providers/taskProgress/useTaskProgress';

const CONFIDENCE_MIN = 0.2;

/**
 * Manages the endcustomer research lifecycle for a single project:
 * workflow trigger → polling → candidate list → confirm / reject.
 */
export function useEndcustomerResearch(projectId: number, _endcustomerIsSet: boolean) {
  const [candidates, setCandidates] = useState<EndcustomerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const { progress, start, reset, cancel } = useTaskProgress();

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectEndcustomerCandidates(projectId);
      setCandidates(data.filter((c) => (c.confidence ?? 0) >= CONFIDENCE_MIN));
    } catch {
      toast.error('Fehler beim Laden der Endkunden-Kandidaten');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Toast for polling progress
  useEffect(() => {
    showTaskProgress(progress, reset, cancel);
  }, [progress, reset, cancel]);

  // Load candidates after workflow completes
  useEffect(() => {
    if (progress.done === progress.total && progress.total > 0) {
      void loadCandidates();
    }
  }, [progress.done, progress.total, loadCandidates]);

  const handleResearch = useCallback(async () => {
    try {
      const task = await postResearchEndcustomer(projectId);
      start([task]);
    } catch {
      toast.error('Endkunden-Recherche konnte nicht gestartet werden');
    }
  }, [projectId, start]);

  const handleConfirm = useCallback(async (candidateId: number) => {
    try {
      await postConfirmCandidate(candidateId);
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch {
      toast.error('Bestätigung fehlgeschlagen');
    }
  }, []);

  const handleReject = useCallback(async (candidateId: number) => {
    try {
      await postRejectCandidate(candidateId);
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch {
      toast.error('Ablehnung fehlgeschlagen');
    }
  }, []);

  return {
    candidates,
    loading,
    progress,
    handleResearch,
    handleConfirm,
    handleReject,
    loadCandidates,
  };
}
