/**
 * useLLMTaskMappings – Hook zum Laden und Verwalten von Task-Mappings.
 *
 * Lädt Tasks samt Mappings via taskMappingService.
 * Bietet Auto-Save (PUT) bei Dropdown-Änderung und Toggle (PATCH) für active.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { withAsyncState } from '@src/lib/withAsyncState';

import {
  fetchTasks,
  setTaskMappingActive,
  upsertTaskMapping,
  type TaskMappingUpsert,
  type TaskWithMapping,
} from '../services/taskMappingService';

interface UseLLMTaskMappingsReturn {
  tasks: TaskWithMapping[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  handleUpsertMapping: (
    task: string,
    data: TaskMappingUpsert,
  ) => Promise<TaskWithMapping | null>
  handleToggleActive: (
    task: string,
    active: boolean,
  ) => Promise<TaskWithMapping | null>
}
// ── Types ───────────────────────────────────────────────────────────────────

/** Loads task mappings and exposes upsert + toggle. */
export function useLLMTaskMappings(): UseLLMTaskMappingsReturn {
  const [tasks, setTasks] = useState<TaskWithMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const data = await withAsyncState(setLoading, setError, fetchTasks);
    if (data) setTasks(data);
  }, []);

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    void (async () => { await refetch(); })();
  }, [refetch]);

  const handleUpsertMapping = useCallback(
    async (
      task: string,
      data: TaskMappingUpsert,
    ): Promise<TaskWithMapping | null> => {
      try {
        const result = await upsertTaskMapping(task, data);
        setTasks((prev) =>
          prev.map((uc) => (uc.key === task ? result : uc)),
        );
        return result;
      } catch {
        setError(`Fehler beim Speichern des Mappings für "${task}".`);
        return null;
      }
    },
    [],
  );

  const handleToggleActive = useCallback(
    async (
      task: string,
      active: boolean,
    ): Promise<TaskWithMapping | null> => {
      try {
        const result = await setTaskMappingActive(task, active);
        setTasks((prev) =>
          prev.map((uc) => (uc.key === task ? result : uc)),
        );
        return result;
      } catch {
        setError(`Fehler beim Umschalten des Active-Status für "${task}".`);
        return null;
      }
    },
    [],
  );

  return {
    tasks,
    loading,
    error,
    refetch,
    handleUpsertMapping,
    handleToggleActive,
  };
}
