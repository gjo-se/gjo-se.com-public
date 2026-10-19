import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchLatestEval,
  fetchLatestEvalBatch,
  fetchEvalRuns,
  triggerEval as apiTriggerEval,
  type LlmEvalRun,
} from '@src/features/llm/services/evalRunService';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 600_000;

export interface UseTaskEvalRunsResult {
  latestRun: LlmEvalRun | null;
  /** All runs from the latest trigger batch (one per candidate). */
  latestBatch: LlmEvalRun[];
  runs: LlmEvalRun[];
  loading: boolean;
  error: string | null;
  triggerEval: () => Promise<void>;
  isRunning: boolean;
  refresh: () => Promise<void>;
}

/**
 *
 */
export function useTaskEvalRuns(
  taskKey: string | undefined,
): UseTaskEvalRunsResult {
  const [latestRun, setLatestRun] = useState<LlmEvalRun | null>(null);
  const [latestBatch, setLatestBatch] = useState<LlmEvalRun[]>([]);
  const [runs, setRuns] = useState<LlmEvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const [latest, batch] = await Promise.all([
        fetchLatestEval(key),
        fetchLatestEvalBatch(key),
      ]);
      setLatestRun(latest);
      setLatestBatch(batch);
    } catch {
      setError('Eval-Run konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!taskKey) return;
    void load(taskKey);
  }, [taskKey, load]);

  // Cleanup polling on unmount.
  useEffect(() => {
    return () => { stopPolling(); };
  }, [stopPolling]);

  const startPolling = useCallback(
    (key: string) => {
      stopPolling();
      setIsRunning(true);

      const poll = async () => {
        try {
          const [latest, batch] = await Promise.all([
            fetchLatestEval(key),
            fetchLatestEvalBatch(key),
          ]);
          setLatestRun(latest);
          setLatestBatch(batch);
          // Stop polling only when ALL runs in the batch are completed
          // (not just the latest one — other candidates may still be running).
          if (latest && batch.every(r => r.overall_status !== 'running')) {
            stopPolling();
            setIsRunning(false);
          }
        } catch {
          // Keep polling on transient errors.
        }
      };

      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

      // Timeout after 10 min.
      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setIsRunning(false);
        setError('Evaluierung dauert länger als erwartet. Bitte später erneut prüfen.');
      }, POLL_TIMEOUT_MS);
    },
    [stopPolling],
  );

  const triggerEval = useCallback(async () => {
    if (!taskKey || isRunning) return;
    setError(null);
    try {
      await apiTriggerEval(taskKey);
      startPolling(taskKey);
    } catch {
      setError('Eval-Run konnte nicht gestartet werden.');
    }
  }, [taskKey, isRunning, startPolling]);

  const refresh = useCallback(async () => {
    if (!taskKey) return;
    await load(taskKey);
    try {
      const all = await fetchEvalRuns(taskKey);
      setRuns(all);
    } catch {
      // History is optional.
    }
  }, [taskKey, load]);

  return {
    latestRun,
    latestBatch,
    runs,
    loading,
    error,
    triggerEval,
    isRunning,
    refresh,
  };
}
