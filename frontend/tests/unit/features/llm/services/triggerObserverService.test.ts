/**
 * Tests: triggerObserverService – HTTP contract for observer endpoints.
 *
 * Both reads target the task-scoped admin endpoints and return the payload
 * unchanged.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchTaskExamples,
  fetchTaskTriggers,
  type TaskExamplesResponse,
  type TriggerStatsResponse,
} from '@src/features/llm/services/triggerObserverService';

const http = vi.hoisted(() => {
  const urls: string[] = []
  let result: unknown = undefined

  return {
    urls,
    api: {
      get: (url: string): Promise<{ data: unknown }> => {
        urls.push(url)
        return Promise.resolve({ data: result })
      },
    },
    reset(): void {
      urls.length = 0
      result = undefined
    },
    respondWith(next: unknown): void {
      result = next
    },
  }
})

vi.mock('@src/lib/api/axios', () => ({ api: http.api }));

const examples: TaskExamplesResponse = {
  task_key: 'merge_description',
  input_example: { project: 1 },
  output_schema: null,
  output_example: 'merged',
};

const triggers: TriggerStatsResponse = {
  task_key: 'merge_description',
  allowed: ['manual', 'model_change'],
  observed: [{ trigger: 'manual', count: 3, first_seen: null, last_seen: null }],
  unused: ['model_change'],
};

describe('triggerObserverService', () => {
  beforeEach(() => {
    http.reset();
  });

  it('loads input/output examples for a task', async () => {
    http.respondWith(examples);

    await expect(fetchTaskExamples('merge_description')).resolves.toEqual(examples);
    expect(http.urls).toEqual(['/admin/llm/tasks/merge_description/examples']);
  });

  it('loads trigger statistics for a task', async () => {
    http.respondWith(triggers);

    await expect(fetchTaskTriggers('merge_description')).resolves.toEqual(triggers);
    expect(http.urls).toEqual(['/admin/llm/tasks/merge_description/triggers']);
  });
});
