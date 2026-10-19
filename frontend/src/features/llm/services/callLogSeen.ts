/**
 * callLogSeen – Shared helper for the "unread LLM errors" badge state.
 *
 * The badge compares the newest error timestamp against the last time the log
 * page was opened, persisted in localStorage. No polling, no WebSocket.
 */

const SEEN_STORAGE_KEY = 'llm-call-logs-seen-at';

/** Persists "now" as the last-seen timestamp so the unread badge resets. */
export function markCallLogsSeen(): void {
  try {
    localStorage.setItem(SEEN_STORAGE_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors – the badge simply stays until the next visit.
  }
}

/** Reads the persisted last-seen timestamp (ms epoch), or 0 when unset. */
export function readCallLogsSeenAt(): number {
  try {
    const raw = localStorage.getItem(SEEN_STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}
