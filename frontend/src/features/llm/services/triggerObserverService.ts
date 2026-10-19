/**
 * Service for trigger observer data (live statistics + input/output examples).
 *
 * Consumes the INC-3 endpoints:
 * - GET /admin/llm/tasks/{task}/triggers  → TriggerStatsResponse
 * - GET /admin/llm/tasks/{task}/examples  → TaskExamplesResponse
 */
import { api } from '@src/lib/api/axios';

/** Input/output examples from the most recent call-log entries. */
export interface TaskExamplesResponse {
  task_key: string
  input_example: Record<string, unknown> | null
  output_schema: Record<string, unknown> | null
  output_example: unknown
}

/** One observed trigger row from the call log. */
export interface TriggerObservation {
  trigger: string
  count: number
  first_seen: string | null
  last_seen: string | null
}

/** Aggregated trigger statistics: allowed, observed, unused. */
export interface TriggerStatsResponse {
  task_key: string
  allowed: string[]
  observed: TriggerObservation[]
  unused: string[]
}

const tasksBase = '/admin/llm/tasks';

/** Fetch the latest input/output examples for a task. */
export async function fetchTaskExamples(
  taskKey: string,
): Promise<TaskExamplesResponse> {
  const res = await api.get<TaskExamplesResponse>(
    `${tasksBase}/${taskKey}/examples`,
  );
  return res.data;
}

/** Fetch live trigger statistics for a task. */
export async function fetchTaskTriggers(
  taskKey: string,
): Promise<TriggerStatsResponse> {
  const res = await api.get<TriggerStatsResponse>(
    `${tasksBase}/${taskKey}/triggers`,
  );
  return res.data;
}
