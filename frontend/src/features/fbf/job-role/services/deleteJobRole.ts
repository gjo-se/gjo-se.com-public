/**
 * delete-job-role – Delete endpoint.
 */

import api from '@src/lib/api/axios';

/** Deletes a job role by ID. Plain function for reuse outside React. */
export function deleteJobRoleById(jobRoleId: number) {
  return api.delete(`/admin/fbf/job-role/${jobRoleId}`);
}
