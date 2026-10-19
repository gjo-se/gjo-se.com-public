/** Hook that polls task statuses until all are terminal. */

import { useCallback, useEffect, useRef, useState } from 'react';


import { getBulkStatus } from '@src/lib/api/aiscopeTasks';
import type { TaskRef, TaskStatus } from '@src/lib/api/aiscopeTasks';
import { feTrace } from '@src/lib/trace';

export interface TaskProgress {
  /** Completed count. */
  done: number;
  /** Failed count. */
  failed: number;
  /** Total count. */
  total: number;
  /** True when every task is done or failed. */
  isComplete: boolean;
  /** Human-readable status line. */
  label: string;
  /** Elapsed time in milliseconds since the task was started. */
  elapsedMs: number;
  /** Currently running count. */
  running: number;
  /** Per-project task status (project_id → latest status). */
  statusByProject: Map<number, TaskStatus>;
  /** True when the user cancelled the polling. */
  isCancelled: boolean;
  /** True when the polling timed out. */
  isTimeout: boolean;
}

interface UseTaskProgressReturn {
  progress: TaskProgress;
  /** Start polling for the given task references. */
  start: (tasks: TaskRef[]) => void;
  /** Stop polling and reset state. */
  reset: () => void;
  /** Cancel polling — marks remaining tasks as cancelled. */
  cancel: () => void;
}

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const MAX_POLL_RETRIES = 3;

/**
 *
 */
export function useTaskProgress(): UseTaskProgressReturn {
  const [tasks, setTasks] = useState<TaskRef[]>([]);
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>({});
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isCancelled, setIsCancelled] = useState(false);
  const [isTimeout, setIsTimeout] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);
  const startedAtRef = useRef(0);
  const pollRetryCountRef = useRef(0);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const markRemainingAs = useCallback((status: TaskStatus, setter: (v: boolean) => void) => {
    setter(true);
    stop();
    setStatuses((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([id, s]) => {
        if (s.status !== 'done' && s.status !== 'failed') {
          next[id] = status;
        }
      });
      return next;
    });
  }, [stop]);

  const poll = useCallback(async (refs: TaskRef[]) => {
    const taskIds = refs.map((r) => r.task_id);
    let allTerminal = true;
    feTrace.time('poll_bulk_status');
    try {
      const results = await getBulkStatus(taskIds);
      feTrace.timeEnd('poll_bulk_status', { tasks: taskIds.length });
      pollRetryCountRef.current = 0; // reset on success
      taskIds.forEach((id) => {
        const s = results[id];
        if (s && s.status !== 'done' && s.status !== 'failed') {
          allTerminal = false;
        }
      });
      setStatuses((prev) => {
        const done = Object.values(results).filter((s: TaskStatus) => s.status === 'done').length;
        feTrace.mark('poll_status_delta', { done, total: taskIds.length });
        return { ...prev, ...results };
      });
    } catch {
      feTrace.timeEnd('poll_bulk_status', { error: 'poll_failed' });
      pollRetryCountRef.current += 1;
      if (pollRetryCountRef.current >= MAX_POLL_RETRIES) {
        // Max retries exceeded — mark all as failed
        const failed: Record<string, TaskStatus> = {};
        taskIds.forEach((id) => {
          failed[id] = { status: 'failed', error: `Poll fehlgeschlagen (${MAX_POLL_RETRIES}x)` };
        });
        setStatuses((prev) => ({ ...prev, ...failed }));
        return true; // stop polling
      }
      // Otherwise: retry on next interval (don't mark as failed yet)
      allTerminal = false;
    }
    return allTerminal;
  }, []);

  const startElapsedTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    elapsedRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);
  }, []);

  const start = useCallback(
    (refs: TaskRef[]) => {
      abortRef.current = false;
      pollRetryCountRef.current = 0;
      setIsCancelled(false);
      setIsTimeout(false);
      setTasks(refs);
      setStatuses({});
      stop();
      startElapsedTimer();

      // Timeout: abort after MAX_POLL_DURATION_MS
      timeoutRef.current = setTimeout(() => {
        markRemainingAs(
          { status: 'failed', error: `Timeout nach ${Math.round(MAX_POLL_DURATION_MS / 60000)} Min` },
          setIsTimeout,
        );
      }, MAX_POLL_DURATION_MS);

      intervalRef.current = setInterval(async () => {
        if (abortRef.current) return;
        const done = await poll(refs);
        if (done) {
          stop();
        }
      }, POLL_INTERVAL_MS);
    },
    [poll, stop, startElapsedTimer, markRemainingAs],
  );

  const cancel = useCallback(() => {
    abortRef.current = true;
    markRemainingAs({ status: 'failed', error: 'Vom Benutzer abgebrochen' }, setIsCancelled);
  }, [markRemainingAs]);

  const reset = useCallback(() => {
    abortRef.current = true;
    stop();
    setTasks([]);
    setStatuses({});
    setElapsedMs(0);
    setIsCancelled(false);
    setIsTimeout(false);
    startedAtRef.current = 0;
    pollRetryCountRef.current = 0;
  }, [stop]);

  useEffect(() => () => {
    abortRef.current = true;
    stop();
    setElapsedMs(0);
  }, [stop]);

  const done = Object.values(statuses).filter((s) => s.status === 'done').length;
  const failed = Object.values(statuses).filter((s) => s.status === 'failed').length;
  const running = Object.values(statuses).filter((s) => s.status === 'running').length;
  const total = tasks.length;
  const isComplete = total > 0 && done + failed === total;

  // Build per-project status map – include queued tasks so the table
  // shows progress immediately, even before the first poll returns.
  const statusByProject = new Map<number, TaskStatus>();
  tasks.forEach((ref) => {
    const s = statuses[ref.task_id];
    statusByProject.set(ref.project_id, s ?? { status: 'queued' });
  });

  let label: string;
  if (total === 0) {
    label = '';
  } else if (isCancelled) {
    label = `Abgebrochen (${done + failed}/${total})`;
  } else if (isTimeout) {
    label = `Timeout (${done + failed}/${total} abgeschlossen)`;
  } else if (isComplete && failed === 0) {
    label = `${done}/${total} Merges erfolgreich`;
  } else if (isComplete) {
    label = `${failed}/${total} Merges fehlgeschlagen`;
  } else {
    label = `Merge: ${done + failed}/${total} abgeschlossen`;
  }

  return {
    progress: { done, failed, total, isComplete, label, elapsedMs, running, statusByProject, isCancelled, isTimeout },
    start,
    reset,
    cancel,
  };
}
