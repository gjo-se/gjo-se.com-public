/**
 * Tests: usePipelineTest – act/project selection, trigger, progress-driven
 * result loading and the task-key reset.
 *
 * The pipeline callbacks are injected dependencies (public interface); the
 * task-progress polling talks to the HTTP edge, which is faked.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PipelineResultResponse } from '@src/lib/api/aiscopeEndcustomer';
import { usePipelineTest } from '@src/features/llm/hooks/usePipelineTest';

const http = vi.hoisted(() => {
  let bulkStatus: Record<string, { status: string }> = {}

  return {
    api: {
      post: (): Promise<{ data: unknown }> => Promise.resolve({ data: { statuses: bulkStatus } }),
    },
    reset(): void {
      bulkStatus = {}
    },
    respondBulkWith(next: Record<string, { status: string }>): void {
      bulkStatus = next
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

const pipelineResult: PipelineResultResponse = {
  project_id: 5,
  phase: 'done',
  stopped_at_act: null,
  acts: {},
  candidates_fused: 3,
};

function makeDeps(overrides: Partial<Parameters<typeof usePipelineTest>[1]> = {}) {
  return {
    triggerResearch: vi.fn().mockResolvedValue({ task_id: 'task-1', project_id: 5 }),
    fetchPipelineResult: vi.fn().mockResolvedValue(pipelineResult),
    ...overrides,
  };
}

describe('usePipelineTest', () => {
  beforeEach(() => {
    http.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the act options and starts without a selection', () => {
    const { result } = renderHook(() => usePipelineTest('merge_description', makeDeps()));

    expect(result.current.actOptions).toHaveLength(7);
    expect(result.current.selectedAct).toBeNull();
    expect(result.current.selectedProjectId).toBeNull();
    expect(result.current.running).toBe(false);
  });

  it('does not trigger a run when act or project is missing', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => usePipelineTest('merge_description', deps));

    act(() => {
      result.current.setSelectedProjectId(5);
    });
    await act(async () => {
      await result.current.handleRun();
    });

    expect(deps.triggerResearch).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('starts the run and exposes the task id and running state', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => usePipelineTest('merge_description', deps));
    http.respondBulkWith({ 'task-1': { status: 'running' } });

    act(() => {
      result.current.setSelectedAct(4);
      result.current.setSelectedProjectId(5);
    });
    await act(async () => {
      await result.current.handleRun();
    });

    expect(deps.triggerResearch).toHaveBeenCalledWith(5, 4);
    expect(result.current.taskId).toBe('task-1');
    expect(result.current.running).toBe(true);
  });

  it('reports an error when the run cannot be started', async () => {
    const deps = makeDeps({ triggerResearch: vi.fn().mockRejectedValue(new Error('queue down')) });
    const { result } = renderHook(() => usePipelineTest('merge_description', deps));

    act(() => {
      result.current.setSelectedAct(2);
      result.current.setSelectedProjectId(5);
    });
    await act(async () => {
      await result.current.handleRun();
    });

    expect(result.current.error).toBe('Pipeline konnte nicht gestartet werden.');
    expect(result.current.taskId).toBeNull();
  });

  it('loads the pipeline result once polling reports completion', async () => {
    vi.useFakeTimers();
    const deps = makeDeps();
    const { result } = renderHook(() => usePipelineTest('merge_description', deps));
    http.respondBulkWith({ 'task-1': { status: 'done' } });

    act(() => {
      result.current.setSelectedAct(8);
      result.current.setSelectedProjectId(5);
    });
    await act(async () => {
      await result.current.handleRun();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.result).toEqual(pipelineResult);
    expect(deps.fetchPipelineResult).toHaveBeenCalledWith('task-1');
  });

  it('reports an error when the completed result cannot be loaded', async () => {
    vi.useFakeTimers();
    const deps = makeDeps({ fetchPipelineResult: vi.fn().mockRejectedValue(new Error('gone')) });
    const { result } = renderHook(() => usePipelineTest('merge_description', deps));
    http.respondBulkWith({ 'task-1': { status: 'done' } });

    act(() => {
      result.current.setSelectedAct(8);
      result.current.setSelectedProjectId(5);
    });
    await act(async () => {
      await result.current.handleRun();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe('Ergebnis konnte nicht geladen werden.');
  });
});
