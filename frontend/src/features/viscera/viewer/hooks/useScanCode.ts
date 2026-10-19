import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@src/lib/api/axios';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Activity {
  name: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  error?: string;
}

export interface ScanCodeState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  activities: Activity[];
  result: ScanResult | null;
  error: string | null;
  elapsed: number;
}

export interface ScanResult {
  objects_updated: number;
  objects_new: number;
  objects_missing: number;
}

export interface UseScanCodeReturn {
  state: ScanCodeState;
  startScan: (onComplete?: () => void) => Promise<void>;
  cancel: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTIVITY_DEFS: { name: string; label: string }[] = [
  { name: 'docker_compose', label: 'DockerComposeParser' },
  { name: 'deterministic_processor', label: 'DeterministicProcessor' },
  { name: 'llm_enrichment', label: 'LLM Enrichment' },
];

const POLL_INTERVAL_MS = 2000;

// ── Helpers ────────────────────────────────────────────────────────────────────

function createActivities(): Activity[] {
  return ACTIVITY_DEFS.map((a) => ({ ...a, status: 'pending' as const }));
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Hook that manages the scan-code workflow lifecycle:
 * POST trigger → poll loop → status tracking with per-activity indicators.
 *
 * @returns State and control functions for the scan-code workflow UI.
 */
export function useScanCode(): UseScanCodeReturn {
  const [state, setState] = useState<ScanCodeState>({
    status: 'idle',
    activities: createActivities(),
    result: null,
    error: null,
    elapsed: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const workflowIdRef = useRef<string | null>(null);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const stopTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  const poll = useCallback(async (workflowId: string): Promise<boolean> => {
    try {
      const res = await api.get<{
        status: string;
        current_activity: string | null;
        result: { objects_updated: number; objects_new: number; objects_missing: number } | null;
        error: string | null;
      }>(`/workflows/scan-code/${workflowId}`);

      const { status, current_activity, result, error } = res.data;

      if (status === 'completed') {
        setState((prev) => ({
          ...prev,
          status: 'completed',
          activities: prev.activities.map((a) => ({ ...a, status: 'done' as const })),
          result: result ?? null,
        }));
        onCompleteRef.current?.();
        return true;
      }

      if (status === 'failed') {
        setState((prev) => {
          const activities = prev.activities.map((a) => {
            if (a.name === current_activity) {
              return { ...a, status: 'failed' as const, error: error ?? undefined };
            }
            return a;
          });
          return { ...prev, status: 'failed', activities, error: error ?? null };
        });
        return true;
      }

      // running — update activity indicators based on current_activity
      setState((prev) => {
        const currentIdx = current_activity
          ? ACTIVITY_DEFS.findIndex((act) => act.name === current_activity)
          : -1;

        const activities = prev.activities.map((a) => {
          const activityIdx = ACTIVITY_DEFS.findIndex((act) => act.name === a.name);
          if (activityIdx === currentIdx) {
            return { ...a, status: 'running' as const };
          }
          if (currentIdx >= 0 && activityIdx < currentIdx) {
            return { ...a, status: 'done' as const };
          }
          return a;
        });

        return { ...prev, activities };
      });

      return false;
    } catch {
      // Network error during poll — retry on next interval
      return false;
    }
  }, []);

  const startScan = useCallback(async (onComplete?: () => void) => {
    if (state.status === 'running') return;

    // Store onComplete in a ref so the poll closure can access it
    onCompleteRef.current = onComplete ?? null;

    // Initialize: first activity running, rest pending
    const activities = createActivities();
    activities[0]!.status = 'running';

    setState({
      status: 'running',
      activities,
      result: null,
      error: null,
      elapsed: 0,
    });

    startTimeRef.current = Date.now();
    elapsedRef.current = setInterval(() => {
      setState((prev) => ({
        ...prev,
        elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
      }));
    }, 1000);

    try {
      const res = await api.post<{ workflow_id: string; status: string }>(
        '/workflows/scan-code',
      );
      workflowIdRef.current = res.data.workflow_id;

      intervalRef.current = setInterval(async () => {
        const wid = workflowIdRef.current;
        if (!wid) return;
        const done = await poll(wid);
        if (done) {
          stopTimers();
        }
      }, POLL_INTERVAL_MS);
    } catch (err: unknown) {
      stopTimers();
      const message = err instanceof Error ? err.message : 'Scan konnte nicht gestartet werden';
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: message,
        activities: prev.activities.map((a) =>
          a.name === ACTIVITY_DEFS[0]?.name
            ? { ...a, status: 'failed' as const, error: message }
            : a,
        ),
      }));
    }
  }, [state.status, poll, stopTimers]);

  const cancel = useCallback(() => {
    stopTimers();
    setState({
      status: 'idle',
      activities: createActivities(),
      result: null,
      error: null,
      elapsed: 0,
    });
  }, [stopTimers]);

  useEffect(() => () => {
    stopTimers();
  }, [stopTimers]);

  return { state, startScan, cancel };
}
