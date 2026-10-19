/** Hook for iterative endcustomer pipeline testing – act-by-act with project selection. */

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type { PipelineResultResponse } from '@src/lib/api/aiscopeEndcustomer';
import type { TaskRef } from '@src/lib/api/aiscopeTasks';
import { useTaskProgress } from '@src/providers/taskProgress/useTaskProgress';

// ── Constants ────────────────────────────────────────────────────────────────

export const ACT_OPTIONS: { value: number; label: string }[] = [
  { value: 2, label: 'Act 1-2: Signale extrahieren' },
  { value: 3, label: 'Act 1-3: Signale + Suche' },
  { value: 4, label: 'Act 1-4: Signale + Suche + Filter' },
  { value: 5, label: 'Act 1-5: … + Page Fetch' },
  { value: 6, label: 'Act 1-6: … + Embedding' },
  { value: 7, label: 'Act 1-7: … + LLM Evaluation' },
  { value: 8, label: 'Vollständig (Acts 1-8)' },
];

// ── Dependencies (IoC – avoids cross-feature imports) ────────────────────────

export interface UsePipelineTestDeps {
  triggerResearch: (projectId: number, stopAfterAct?: number) => Promise<TaskRef>;
  fetchPipelineResult: (taskId: string) => Promise<PipelineResultResponse>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface UsePipelineTestResult {
  actOptions: typeof ACT_OPTIONS;
  selectedAct: number | null;
  setSelectedAct: (v: number | null) => void;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  running: boolean;
  result: PipelineResultResponse | null;
  handleRun: () => Promise<void>;
  error: string | null;
  taskId: string | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 *
 */
export function usePipelineTest(
  taskKey: string,
  deps: UsePipelineTestDeps,
): UsePipelineTestResult {
  const [selectedAct, setSelectedAct] = useState<number | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [result, setResult] = useState<PipelineResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const { progress, start } = useTaskProgress();

  const running = progress.total > 0 && !progress.isComplete;

  const handleRun = useCallback(async () => {
    if (selectedProjectId == null || selectedAct == null) {
      toast.error('Bitte wähle einen Act und ein Projekt aus.');
      return;
    }

    setError(null);
    setResult(null);
    try {
      const task = await deps.triggerResearch(selectedProjectId, selectedAct);
      setTaskId(task.task_id);
      start([task]);
    } catch {
      toast.error('Pipeline konnte nicht gestartet werden.');
      setError('Pipeline konnte nicht gestartet werden.');
    }
  }, [selectedProjectId, selectedAct, deps, start]);

  // Fetch pipeline result when polling completes
  useEffect(() => {
    if (!progress.isComplete || progress.failed > 0 || !taskId) return;

    let cancelled = false;
    const fetch = async () => {
      try {
        const data = await deps.fetchPipelineResult(taskId);
        if (!cancelled) {
          setResult(data);
        }
      } catch {
        if (!cancelled) {
          setError('Ergebnis konnte nicht geladen werden.');
        }
      }
    };
    void fetch();
    return () => { cancelled = true; };
  }, [progress.isComplete, progress.failed, taskId, deps]);

  // Reset state when the task key changes (adjusting state during render).
  const [prevTaskKey, setPrevTaskKey] = useState(taskKey);
  if (prevTaskKey !== taskKey) {
    setPrevTaskKey(taskKey);
    setResult(null);
    setError(null);
    setTaskId(null);
  }

  return {
    actOptions: ACT_OPTIONS,
    selectedAct,
    setSelectedAct,
    selectedProjectId,
    setSelectedProjectId,
    running,
    result,
    handleRun,
    error,
    taskId,
  };
}
