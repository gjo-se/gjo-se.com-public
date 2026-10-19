import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  fetchCallLogs,
  fetchCallLogStats,
  fetchObservabilityConfig,
  fetchPromotedStatus,
  getTaskProgress,
  promoteToDataset,
  resolveTicket,
  retryCallLog,
  retryCallLogBatch,
  unpromoteFromDataset,
} from '@src/lib/api/callLog';
import { worker } from '@src/mocks/browser';

import { createCapture } from './testUtils';

const callLogsPath = '/api/v1/admin/llm/call-logs';

describe('callLog', () => {
  it('forwards only the provided call-log filters', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(callLogsPath, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json({ items: [{ id: 1, task: 'description_merge' }], total: 1 });
      }),
    );

    const page = await fetchCallLogs({ limit: 10, q: 'merge', only_errors: true });

    expect(parameters.latest()?.get('limit')).toBe('10');
    expect(parameters.latest()?.get('q')).toBe('merge');
    expect(parameters.latest()?.get('only_errors')).toBe('true');
    expect(parameters.latest()?.has('offset')).toBe(false);
    expect(page.total).toBe(1);
  });

  it('loads the aggregated statistics since a timestamp', async () => {
    const parameters = createCapture<URLSearchParams>();
    worker.use(
      http.get(`${callLogsPath}/stats`, ({ request }) => {
        parameters.add(new URL(request.url).searchParams);
        return HttpResponse.json({
          total: 5,
          success: 4,
          errors: 1,
          by_error_type: { provider_error: 1 },
        });
      }),
    );

    const stats = await fetchCallLogStats('2026-10-01T00:00:00Z');

    expect(parameters.latest()?.get('since')).toBe('2026-10-01T00:00:00Z');
    expect(stats.errors).toBe(1);
    expect(stats.by_error_type.provider_error).toBe(1);
  });

  it('loads the observability configuration', async () => {
    worker.use(
      http.get('/api/v1/admin/llm/observability', () =>
        HttpResponse.json({
          enabled: true,
          project: 'gjo-se',
          url: 'http://localhost:3001',
        }),
      ),
    );

    const config = await fetchObservabilityConfig();

    expect(config.enabled).toBe(true);
    expect(config.project).toBe('gjo-se');
  });

  it('loads the dataset promotion status of a call log', async () => {
    worker.use(
      http.get(`${callLogsPath}/1/promoted-status`, () =>
        HttpResponse.json({ call_log_id: 1, promoted_to: 'golden' }),
      ),
    );

    const status = await fetchPromotedStatus(1);

    expect(status.promoted_to).toBe('golden');
  });

  it('polls the progress of a batch job', async () => {
    const progress = await getTaskProgress('task-1');

    expect(progress.status).toBe('done');
    expect(progress.progress).toBe(100);
  });

  it('promotes a call log to a dataset with its label', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post(`${callLogsPath}/1/promote-to-dataset`, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          status: 'created',
          message: 'Aufgenommen',
          dataset_item_id: 'item-1',
          duplicate_call_log_id: null,
          validation_errors: [],
        });
      }),
    );

    const result = await promoteToDataset(1, 'golden');

    expect(receivedBody).toEqual({ label: 'golden' });
    expect(result.status).toBe('created');
  });

  it('removes a call log from the dataset', async () => {
    worker.use(
      http.delete(`${callLogsPath}/1/promote-to-dataset`, () =>
        HttpResponse.json({
          status: 'rejected',
          message: 'Entfernt',
          dataset_item_id: null,
          duplicate_call_log_id: null,
          validation_errors: [],
        }),
      ),
    );

    const result = await unpromoteFromDataset(1);

    expect(result.message).toBe('Entfernt');
  });

  it('retries a single call log and a batch of call logs', async () => {
    let batchBody: unknown;
    worker.use(
      http.post(`${callLogsPath}/retry-batch`, async ({ request }) => {
        batchBody = await request.json();
        return HttpResponse.json({ job_id: 'job-1', queued_count: 2 });
      }),
    );

    const retried = await retryCallLog(1);
    const batch = await retryCallLogBatch([1, 2]);

    expect(retried.id).toBe(1);
    expect(batchBody).toEqual({ ids: [1, 2] });
    expect(batch.queued_count).toBe(2);
  });

  it('resolves an observer ticket with the resolved status', async () => {
    let receivedBody: unknown;
    worker.use(
      http.patch('/api/v1/admin/llm/observer/tickets/:id', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          id: 1,
          ticket_type: 'latency',
          severity: 'warning',
          task: 'description_merge',
          status: 'resolved',
          created_at: '2026-10-01T08:00:00Z',
          resolved_at: '2026-10-01T09:00:00Z',
          suggested_failure_candidates: [],
        });
      }),
    );

    const ticket = await resolveTicket(1);

    expect(receivedBody).toEqual({ status: 'resolved' });
    expect(ticket.status).toBe('resolved');
  });

  it('surfaces a failing call-log list as an error', async () => {
    worker.use(
      http.get(callLogsPath, () =>
        HttpResponse.json({ detail: 'Call-Logs nicht erreichbar' }, { status: 500 }),
      ),
    );

    await expect(fetchCallLogs()).rejects.toThrow('500');
  });
});
