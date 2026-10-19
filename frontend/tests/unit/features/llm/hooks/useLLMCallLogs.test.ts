/**
 * Tests: useLLMCallLogs – server-side call-log table hook.
 *
 * Uses the public table/row-action contract: mapped rows, retry enablement,
 * the golden-promote confirmation flow and the load error path.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLLMCallLogs } from '@src/features/llm/hooks/useLLMCallLogs';
import type { CallLogOut } from '@src/lib/api/callLog';

const http = vi.hoisted(() => {
  interface RecordedRequest {
    method: 'get' | 'post' | 'delete'
    url: string
  }

  const requests: RecordedRequest[] = []
  const routes = new Map<string, unknown>()
  const failures = new Map<string, Error>()
  let items: CallLogOut[] = []
  let failure: Error | null = null

  function respond(method: RecordedRequest['method'], url: string): Promise<{ data: unknown }> {
    requests.push({ method, url })
    const routeFailure = failures.get(url)
    if (routeFailure) return Promise.reject(routeFailure)
    if (routes.has(url)) return Promise.resolve({ data: routes.get(url) })
    if (url === '/admin/llm/tasks') return Promise.resolve({ data: [] })
    if (failure) return Promise.reject(failure)
    return Promise.resolve({ data: { items, total: items.length } })
  }

  return {
    requests,
    api: {
      get: (url: string) => respond('get', url),
      post: (url: string) => respond('post', url),
      delete: (url: string) => respond('delete', url),
    },
    reset(): void {
      requests.length = 0
      routes.clear()
      failures.clear()
      items = []
      failure = null
    },
    respondWith(next: CallLogOut[]): void {
      items = next
    },
    failWith(error: Error): void {
      failure = error
    },
    route(url: string, data: unknown): void {
      routes.set(url, data)
    },
    failRoute(url: string, error: Error): void {
      failures.set(url, error)
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

function makeLog(overrides: Partial<CallLogOut> = {}): CallLogOut {
  return {
    id: 1,
    task: 'merge_description',
    phase: null,
    project_id: 5,
    trigger: 'manual',
    call_type: 'llm',
    success: false,
    error_type: 'rate_limit',
    error_message: 'Too many requests',
    resolved_model: 'gpt-4',
    resolved_credential: 'key',
    duration_ms: 500,
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
    created_at: '2025-01-01T00:00:00Z',
    input_snapshot: null,
    retry_of_id: null,
    retry_count: 0,
    retry_status: null,
    output_snapshot: null,
    promoted_at: null,
    promoted_to: null,
    dataset_item_id: null,
    ...overrides,
  };
}

beforeEach(() => {
  http.reset();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('useLLMCallLogs', () => {
  it('loads and formats the call-log rows', async () => {
    http.respondWith([makeLog()]);

    const { result } = renderHook(() => useLLMCallLogs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.table.data[0]).toMatchObject({
      id: 1,
      task: 'merge_description',
      projectId: 5,
      trigger: 'manual',
      model: 'gpt-4',
      duration: '0.5s',
      tokens: '15',
      success: false,
      errorType: 'rate_limit',
    });
    expect(result.current.error).toBeNull();
  });

  it('reports a load error when fetching logs fails', async () => {
    http.failWith(new Error('offline'));

    const { result } = renderHook(() => useLLMCallLogs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Fehler beim Laden der Daten.');
  });

  it('disables the retry action for successful calls only', async () => {
    http.respondWith([makeLog({ id: 1, success: false }), makeLog({ id: 2, success: true })]);

    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.table.data).toHaveLength(2));

    const retry = result.current.rowActions.find((action) => action.key === 'retry');

    expect(retry?.disabled?.(result.current.table.data[0])).toBe(false);
    expect(retry?.disabled?.(result.current.table.data[1])).toBe(true);
  });

  it('asks for confirmation before promoting an errored call as golden', async () => {
    http.respondWith([makeLog({ id: 7, error_type: 'rate_limit' })]);
    const onPromote = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => useLLMCallLogs(onPromote));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));

    const promote = result.current.rowActions.find((action) => action.key === 'promote-golden');
    act(() => {
      promote?.onAction(result.current.table.data[0]);
    });

    expect(result.current.confirmPromote).toEqual({
      id: 7,
      label: 'golden',
      warning: 'Call #7 hat einen Fehler (rate_limit). Trotzdem als Golden speichern?',
    });
    expect(onPromote).not.toHaveBeenCalled();
  });

  it('promotes after confirmation and closes the dialog', async () => {
    http.respondWith([makeLog({ id: 7, error_type: 'rate_limit' })]);
    const onPromote = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLLMCallLogs(onPromote));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const promote = result.current.rowActions.find((action) => action.key === 'promote-golden');

    act(() => {
      promote?.onAction(result.current.table.data[0]);
    });
    act(() => {
      result.current.handleConfirmPromote();
    });

    expect(onPromote).toHaveBeenCalledWith(7, 'golden');
    expect(result.current.confirmPromote).toBeNull();
  });

  it('promotes a clean call directly without a confirmation', async () => {
    http.respondWith([makeLog({ id: 8, success: true, error_type: null })]);
    const onPromote = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLLMCallLogs(onPromote));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const promote = result.current.rowActions.find((action) => action.key === 'promote-golden');

    await act(async () => {
      promote?.onAction(result.current.table.data[0]);
    });

    expect(onPromote).toHaveBeenCalledWith(8, 'golden');
    expect(result.current.confirmPromote).toBeNull();
  });

  it('cancels a pending promotion without calling the callback', async () => {
    http.respondWith([makeLog({ id: 9, error_type: 'provider_error' })]);
    const onPromote = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useLLMCallLogs(onPromote));
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const promote = result.current.rowActions.find((action) => action.key === 'promote-golden');

    act(() => {
      promote?.onAction(result.current.table.data[0]);
    });
    act(() => {
      result.current.handleCancelPromote();
    });

    expect(result.current.confirmPromote).toBeNull();
    expect(onPromote).not.toHaveBeenCalled();
  });

  it('reads the promoted and DLQ filters from the URL', async () => {
    window.history.replaceState(
      null,
      '',
      '/?error_type=rate_limit&task=merge_description&only_errors=true&retry_status=dead&promoted=golden',
    );
    http.respondWith([makeLog()]);

    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.promoted).toBe('golden');
    expect(result.current.dlqActive).toBe(true);
  });

  it('writes every filter control into the URL state', async () => {
    http.respondWith([makeLog()]);
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const select = (column: string, value: string) => {
      const filter = (result.current.columns[column] as unknown as {
        filter: (state: Record<string, unknown>) => { props: { onSelect: (next: string) => void } }
      }).filter;
      act(() => { filter({}).props.onSelect(value); });
    };

    select('task', 'merge_description');
    select('errorTypeCell', 'rate_limit');
    select('errorTypeCell', '');
    select('statusCell', 'true');
    select('statusCell', '');
    select('promotedStatus', 'golden');
    select('promotedStatus', 'golden');

    act(() => { result.current.handleDlqToggle(); });
    expect(result.current.dlqActive).toBe(true);
    act(() => { result.current.handleDlqToggle(); });
    expect(result.current.dlqActive).toBe(false);
  });

  it('retries a failed call and reloads', async () => {
    http.respondWith([makeLog({ id: 1, success: false })]);
    http.route('/admin/llm/call-logs/1/retry', makeLog({ id: 1, success: true }));
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const retry = result.current.rowActions.find((action) => action.key === 'retry');

    await act(async () => { retry?.onAction(result.current.table.data[0]); });

    expect(http.requests.some((request) => request.url === '/admin/llm/call-logs/1/retry')).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('reports a failed retry without crashing', async () => {
    http.respondWith([makeLog({ id: 1, success: false })]);
    http.failRoute('/admin/llm/call-logs/1/retry', new Error('kaputt'));
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const retry = result.current.rowActions.find((action) => action.key === 'retry');

    await act(async () => { retry?.onAction(result.current.table.data[0]); });

    expect(result.current.loading).toBe(false);
  });

  it('un-promotes a call that is already promoted with the same label', async () => {
    http.respondWith([makeLog({ id: 3, promoted_to: 'golden' })]);
    http.route('/admin/llm/call-logs/3/promote-to-dataset', {});
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const promote = result.current.rowActions.find((action) => action.key === 'promote-golden');

    await act(async () => { promote?.onAction(result.current.table.data[0]); });

    expect(http.requests.some(
      (request) => request.method === 'delete' && request.url === '/admin/llm/call-logs/3/promote-to-dataset',
    )).toBe(true);
  });

  it('ignores a promotion when no promote callback is wired', async () => {
    http.respondWith([makeLog({ id: 4, success: true, error_type: null })]);
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.table.data).toHaveLength(1));
    const promote = result.current.rowActions.find((action) => action.key === 'promote-failure');

    act(() => { promote?.onAction(result.current.table.data[0]); });

    expect(result.current.confirmPromote).toBeNull();
  });
});

describe('useLLMCallLogs – batch retry', () => {
  it('does nothing without rows', async () => {
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleBatchRetry([]); });

    expect(http.requests.some((request) => request.url === '/admin/llm/call-logs/retry-batch')).toBe(false);
  });

  it('reports a completed batch retry', async () => {
    http.route('/admin/llm/call-logs/retry-batch', { job_id: 'job-1', queued_count: 2 });
    http.route('/tasks/job-1/progress', { status: 'completed', progress: 2, total: 2 });
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleBatchRetry(result.current.table.data.length > 0
        ? result.current.table.data
        : [{ id: 1 }, { id: 2 }] as never);
    });

    expect(result.current.batchRetrying).toBe(false);
  });

  it('reports a partially failed batch retry and exposes the reload action', async () => {
    http.route('/admin/llm/call-logs/retry-batch', { job_id: 'job-2', queued_count: 1 });
    http.route('/tasks/job-2/progress', { status: 'completed_with_errors', progress: 1, total: 2, failed: 1 });
    const warn = vi.spyOn(toast, 'warning');
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleBatchRetry([{ id: 1 }] as never);
    });

    expect(result.current.batchRetrying).toBe(false);
    const options = warn.mock.calls[0]?.[1] as { action?: { onClick: () => void } };
    act(() => { options.action?.onClick(); });
  });

  it('reports a failed batch job', async () => {
    http.route('/admin/llm/call-logs/retry-batch', { job_id: 'job-3', queued_count: 1 });
    http.route('/tasks/job-3/progress', { status: 'failed', progress: 0, total: 1 });
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleBatchRetry([{ id: 1 }] as never);
    });

    expect(result.current.batchRetrying).toBe(false);
  });

  it('reports an enqueue failure', async () => {
    http.failRoute('/admin/llm/call-logs/retry-batch', new Error('kaputt'));
    const { result } = renderHook(() => useLLMCallLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleBatchRetry([{ id: 1 }] as never);
    });

    expect(result.current.batchRetrying).toBe(false);
  });

  it('keeps polling while the batch job is running', async () => {
    http.route('/admin/llm/call-logs/retry-batch', { job_id: 'job-4', queued_count: 1 });
    http.route('/tasks/job-4/progress', { status: 'running', progress: 0, total: 1 });
    vi.useFakeTimers();
    const { result } = renderHook(() => useLLMCallLogs());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    await act(async () => {
      await result.current.handleBatchRetry([{ id: 1 }] as never);
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    vi.useRealTimers();

    expect(http.requests.map((request) => request.url)).toContain('/tasks/job-4/progress');
    expect(result.current.batchRetrying).toBe(true);
  });
});

describe('useLLMCallLogs – background polling', () => {
  it('skips the refresh while the tab is hidden and resumes when visible', async () => {
    http.respondWith([makeLog()]);
    const hidden = vi.spyOn(document, 'hidden', 'get');
    vi.useFakeTimers();
    const { result } = renderHook(() => useLLMCallLogs());
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });

    const loadsBefore = http.requests.filter((request) => request.url === '/admin/llm/call-logs').length;
    hidden.mockReturnValue(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(http.requests.filter((request) => request.url === '/admin/llm/call-logs')).toHaveLength(loadsBefore);

    hidden.mockReturnValue(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    vi.useRealTimers();
    hidden.mockRestore();

    expect(http.requests.filter((request) => request.url === '/admin/llm/call-logs').length)
      .toBeGreaterThan(loadsBefore);
    expect(result.current.loading).toBe(false);
  });
});
