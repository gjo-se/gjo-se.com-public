/**
 * useSkillPendingCount – Number of pending skills awaiting approval.
 *
 * Drives the FBF-Skill sidebar badge. Refetches on mount, on window focus, and
 * when the ``skills-changed`` event fires (dispatched after curation actions),
 * so the badge stays in sync without polling.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchAdminSkillCount } from '../services/skills';

export const SKILLS_CHANGED_EVENT = 'skills-changed';

export interface UseSkillPendingCountResult {
  /** Number of skills with status "pending" (0 = nothing to approve). */
  pendingCount: number
}

/** Loads and live-refreshes the count of pending skills for the nav badge. */
export function useSkillPendingCount(): UseSkillPendingCountResult {
  const [pendingCount, setPendingCount] = useState(0);

  const refresh = useCallback(() => {
    fetchAdminSkillCount({ status: 'pending' })
      .then(setPendingCount)
      .catch(() => {
        // Best-effort: keep the last known count when the fetch fails.
      });
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener(SKILLS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(SKILLS_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return { pendingCount };
}
