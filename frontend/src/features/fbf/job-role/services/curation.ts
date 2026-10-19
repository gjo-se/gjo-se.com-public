/**
 * curation – Admin curation endpoints for FBF job roles.
 *
 * List (with status filter), create, delete, batch-confirm,
 * reassign project links, reject, toggle status, rename.
 */

import api from '@src/lib/api/axios';
import type { components } from '@src/lib/types.generated';

export type JobRoleAdminOut = components['schemas']['JobRoleAdminOut'];
export type JobRoleOut = components['schemas']['JobRoleOut'];

/** Batch-confirms the given pending job roles. Returns the count transitioned. */
export function confirmJobRoles(ids: number[]) {
  return api.post<number>('/admin/fbf/job-role/confirm', { ids }).then(r => r.data);
}

/** Fetches the full admin job role list (incl. project_count, no pagination). */
export function fetchAdminJobRoles(params: { status?: string } = {}) {
  return api.get<JobRoleAdminOut[]>('/admin/fbf/job-role', { params: { ...params, limit: 5000 } }).then(r => r.data);
}

/** Fetches confirmed job roles (for the reassign combobox). */
export function fetchConfirmedJobRoles() {
  return api.get<JobRoleAdminOut[]>('/admin/fbf/job-role', { params: { status: 'active', limit: 5000 } }).then(r => r.data);
}

/** Repoints all projects of a job role to ``targetId`` (or NULL). Returns count updated. */
export function reassignJobRole(id: number, targetId: number | null) {
  return api.post<number>(`/admin/fbf/job-role/${id}/reassign`, { target_id: targetId }).then(r => r.data);
}

/** Renames a job role, preserving the current status. */
export function updateJobRoleName(jobRole: JobRoleAdminOut, name: string) {
  return api
    .put<JobRoleAdminOut>(`/admin/fbf/job-role/${jobRole.id}`, {
      name,
      status: jobRole.status,
    })
    .then(r => r.data);
}
