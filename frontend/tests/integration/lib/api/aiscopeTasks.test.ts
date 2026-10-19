import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  getBulkStatus,
  getTaskStatus,
  postBulkMerge,
  postResearchEndcustomer,
} from '@src/lib/api/aiscopeTasks';
import { worker } from '@src/mocks/browser';

describe('aiscopeTasks', () => {
  it('unwraps the status map of a bulk poll', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/tasks/bulk-status', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({
          statuses: { 'task-1': { status: 'done', progress: 100 } },
        });
      }),
    );

    const statuses = await getBulkStatus(['task-1']);

    expect(receivedBody).toEqual({ task_ids: ['task-1'] });
    expect(statuses['task-1'].status).toBe('done');
    expect(statuses['task-1'].progress).toBe(100);
  });

  it('loads the status of a single task', async () => {
    const status = await getTaskStatus('task-1');

    expect(status.status).toBe('done');
  });

  it('unwraps the enqueued tasks of a bulk merge', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/tasks/bulk-merge', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ tasks: [{ task_id: 'task-2', project_id: 7 }] });
      }),
    );

    const tasks = await postBulkMerge([7]);

    expect(receivedBody).toEqual({ project_ids: [7] });
    expect(tasks).toEqual([{ task_id: 'task-2', project_id: 7 }]);
  });

  it('starts endcustomer research without a stop act by default', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/tasks/research-endcustomer', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ task_id: 'task-3', project_id: 7 });
      }),
    );

    const task = await postResearchEndcustomer(7);

    expect(receivedBody).toEqual({ project_id: 7, stop_after_act: null });
    expect(task.task_id).toBe('task-3');
  });

  it('forwards an explicit stop act to the research workflow', async () => {
    let receivedBody: unknown;
    worker.use(
      http.post('/api/v1/admin/tasks/research-endcustomer', async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json({ task_id: 'task-4', project_id: 7 });
      }),
    );

    await postResearchEndcustomer(7, 3);

    expect(receivedBody).toEqual({ project_id: 7, stop_after_act: 3 });
  });

  it('surfaces a failing task poll as an error', async () => {
    worker.use(
      http.get('/api/v1/admin/tasks/:taskId', () =>
        HttpResponse.json({ detail: 'Task nicht gefunden' }, { status: 404 }),
      ),
    );

    await expect(getTaskStatus('unknown')).rejects.toThrow('404');
  });
});
