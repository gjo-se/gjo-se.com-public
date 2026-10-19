/**
 * useLLMCallLogsUnread – Derives the "unread LLM errors" badge count.
 *
 * Loads the newest error rows once and compares their timestamps against the
 * localStorage "seen-at" marker. Used by the sidebar nav badge. No polling.
 */
import { useEffect, useRef, useState } from 'react';

import { type CallLogOut, fetchCallLogs } from '@src/lib/api/callLog';

import { readCallLogsSeenAt } from '../services/callLogSeen';

export interface UseLLMCallLogsUnreadResult {
  /** Number of errors newer than the last-seen timestamp (0 = nothing new). */
  unreadCount: number
}

const NEWEST_LOAD_LIMIT = 50;

/** Loads newest errors and counts those newer than the last-seen marker. */
export function useLLMCallLogsUnread(): UseLLMCallLogsUnreadResult {
  const [errors, setErrors] = useState<CallLogOut[]>([]);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchCallLogs({ limit: NEWEST_LOAD_LIMIT, only_errors: true })
      .then(res => setErrors(res.items))
      .catch(() => {
        // Best-effort: no badge when the count can't be loaded.
      });
  }, []);

  const seenAt = readCallLogsSeenAt();
  const unreadCount = errors.filter(
    (log) => new Date(log.created_at).getTime() > seenAt,
  ).length;

  return { unreadCount };
}
