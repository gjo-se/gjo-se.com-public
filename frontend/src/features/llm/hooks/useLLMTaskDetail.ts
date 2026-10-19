/**
 * useLLMTaskDetail – Aggregates mapping + observer data for a single task.
 *
 * Combines the task registry entry (display name, placeholders, current
 * model/provider mapping) with live trigger statistics (auto-polling every 15 s).
 * Mapping changes auto-save (PUT/PATCH).
 * Prompts are managed in Langfuse (see LangfusePromptLink component).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchTasks,
  setTaskMappingActive,
  upsertTaskMapping,
  type TaskMappingUpsert,
  type TaskWithMapping,
} from '../services/taskMappingService';
import { fetchTaskExamples, fetchTaskTriggers } from '../services/triggerObserverService';

import type { TaskExamplesResponse, TriggerStatsResponse } from '../services/triggerObserverService';


export interface UseLLMTaskDetailResult {
  task: TaskWithMapping | null
  loading: boolean
  error: string | null
  // Mapping (auto-save)
  saveMapping: (data: TaskMappingUpsert) => Promise<void>
  toggleActive: (active: boolean) => Promise<void>
  // Trigger Observer (live stats + examples)
  triggerStats: TriggerStatsResponse | null
  taskExamples: TaskExamplesResponse | null
  observerLoading: boolean
  observerError: string | null
}

/** Loads mapping data + observer data for one task key and exposes save actions. */
export function useLLMTaskDetail(taskKey: string | undefined): UseLLMTaskDetailResult {
  const [task, setTask] = useState<TaskWithMapping | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [triggerStats, setTriggerStats] = useState<TriggerStatsResponse | null>(null);
  const [taskExamples, setTaskExamples] = useState<TaskExamplesResponse | null>(null);
  const [observerLoading, setObserverLoading] = useState(true);
  const [observerError, setObserverError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!taskKey) return;
    setLoading(true);
    setError(null);
    try {
      const all = await fetchTasks();
      const found = all.find((uc) => uc.key === taskKey) ?? null;
      setTask(found);
      if (!found) setError(`Task "${taskKey}" nicht gefunden.`);
    } catch {
      setError('Fehler beim Laden des Tasks.');
    } finally {
      setLoading(false);
    }
  }, [taskKey]);

  /** Fetch trigger stats and examples in parallel. */
  const loadObserver = useCallback(async (key: string) => {
    setObserverLoading(true);
    setObserverError(null);
    try {
      const [stats, examples] = await Promise.all([
        fetchTaskTriggers(key),
        fetchTaskExamples(key),
      ]);
      setTriggerStats((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(stats)) return stats;
        return prev;
      });
      setTaskExamples(examples);
    } catch {
      setObserverError('Fehler beim Laden der Live-Daten.');
    } finally {
      setObserverLoading(false);
    }
  }, []);

  const initRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!taskKey || initRef.current === taskKey) return;
    initRef.current = taskKey;
    void load();
    void loadObserver(taskKey);
  }, [taskKey, load, loadObserver]);

  // ── Auto-Polling: trigger stats every 15 s ────────────────────────────
  useEffect(() => {
    if (!taskKey) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      intervalId = setInterval(() => {
        void loadObserver(taskKey);
      }, 15_000);
    };

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopPolling();
      } else {
        void loadObserver(taskKey);
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [taskKey, loadObserver]);

  const saveMapping = useCallback(
    async (data: TaskMappingUpsert) => {
      if (!taskKey) return;
      try {
        const result = await upsertTaskMapping(taskKey, data);
        setTask((prev) => (prev ? { ...prev, mapping: result.mapping } : result));
      } catch {
        setError('Fehler beim Speichern der Zuordnung.');
      }
    },
    [taskKey],
  );

  const toggleActive = useCallback(
    async (active: boolean) => {
      if (!taskKey) return;
      try {
        const result = await setTaskMappingActive(taskKey, active);
        setTask((prev) => (prev ? { ...prev, mapping: result.mapping } : result));
      } catch {
        setError('Fehler beim Umschalten des Aktiv-Status.');
      }
    },
    [taskKey],
  );

  return {
    task,
    loading,
    error,
    saveMapping,
    toggleActive,
    triggerStats,
    taskExamples,
    observerLoading,
    observerError,
  };
}
