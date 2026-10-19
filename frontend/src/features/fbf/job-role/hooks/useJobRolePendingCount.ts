/**
 * useJobRolePendingCount – Number of pending job roles awaiting approval.
 *
 * Drives the FBF-JobRole sidebar badge. Refetches on mount, on window focus,
 * and when the ``jobroles-changed`` event fires (dispatched after curation
 * actions), so the badge stays in sync without polling.
 */
import { useCallback, useEffect, useState } from 'react';

import api from '@src/lib/api/axios';

export const JOB_ROLES_CHANGED_EVENT = 'jobroles-changed';

export interface UseJobRolePendingCountResult {
  pendingCount: number
}

/** Loads and live-refreshes the count of pending job roles for the nav badge. */
export function useJobRolePendingCount(): UseJobRolePendingCountResult {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(() => {
    api.get<number>('/admin/fbf/job-role/count', { params: { status: 'pending' } })
      .then(r => setPendingCount(r.data))
      .catch(() => {
        // Best-effort: keep the last known count when the fetch fails.
      });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener(JOB_ROLES_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(JOB_ROLES_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return { pendingCount };
}
