/** HTTP client for the arq task queue API. */

import { api } from '@src/lib/api/axios';

export interface TaskRef {
  task_id: string;
  project_id: number;
}

export interface TaskStatus {
  status: 'queued' | 'running' | 'done' | 'failed';
  progress?: number;
  total?: number;
  error?: string;
  project_id?: number;
  phase?: string;
}

/** Poll multiple task statuses in one request. */
export async function getBulkStatus(taskIds: string[]): Promise<Record<string, TaskStatus>> {
  const res = await api.post<{ statuses: Record<string, TaskStatus> }>('/admin/tasks/bulk-status', {
    task_ids: taskIds,
  });
  return res.data.statuses;
}

/** Poll the current status of a single task. */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  const res = await api.get<TaskStatus>(`/admin/tasks/${taskId}`);
  return res.data;
}

/** Enqueue description-merge jobs for multiple projects. */
export async function postBulkMerge(projectIds: number[]): Promise<TaskRef[]> {
  const res = await api.post<{ tasks: TaskRef[] }>('/admin/tasks/bulk-merge', {
    project_ids: projectIds,
  });
  return res.data.tasks;
}

/** Trigger endcustomer research workflow for a single project. */
export async function postResearchEndcustomer(
  projectId: number,
  stopAfterAct?: number,
): Promise<TaskRef> {
  const res = await api.post<TaskRef>('/admin/tasks/research-endcustomer', {
    project_id: projectId,
    stop_after_act: stopAfterAct ?? null,
  });
  return res.data;
}
