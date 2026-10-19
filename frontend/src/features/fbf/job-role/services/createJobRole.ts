/**
 * create-job-role – Create mutation.
 */

import api from '@src/lib/api/axios';

import type { JobRoleOut } from './curation';

export interface JobRoleCreateInput {
  name: string
  status: string
}

/** Creates a new job role. Returns the created entity or null on error. */
export async function createJobRole(input: JobRoleCreateInput): Promise<JobRoleOut | null> {
  try {
    const { data } = await api.post<JobRoleOut>('/admin/fbf/job-role', input);
    return data;
  } catch {
    return null;
  }
}
