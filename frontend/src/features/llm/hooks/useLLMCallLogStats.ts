/**
 * useLLMCallLogStats – Loads aggregated call-log stats for the dashboard tiles.
 *
 * Provides the tile values (errors today, most common error type, affected
 * tasks) plus the newest error timestamp. The unread-badge state lives in
 * the dedicated useLLMCallLogsUnread hook.
 */
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useMountOnce } from '@src/hooks/useMountOnce';
import {
  type CallLogOut,
  type CallLogStats,
  fetchCallLogs,
  fetchCallLogStats,
} from '@src/lib/api/callLog';

export interface CallLogStatsTiles {
  errorsToday: number
  mostCommonErrorType: string | null
  affectedTasks: number
}

export interface UseLLMCallLogStatsResult {
  tiles: CallLogStatsTiles
  stats: CallLogStats | null
  newestErrorAt: string | null
  loading: boolean
  error: string | null
}

const NEWEST_LOAD_LIMIT = 50;
const DLQ_SEEN_KEY = 'llm-dlq-seen-at';

/** Returns today's midnight as an ISO string for the stats "since" bound. */
function computeStartOfToday(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

/** Counts distinct tasks across the loaded error rows. */
function countAffectedTasks(errors: CallLogOut[]): number {
  return new Set(errors.map((log) => log.task)).size;
}

/** Picks the error type with the highest count from the aggregation. */
function pickMostCommonErrorType(stats: CallLogStats | null): string | null {
  if (!stats) return null;
  const entries = Object.entries(stats.by_error_type);
  if (entries.length === 0) return null;
  return entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max))[0];
}

/** Loads today's stats plus the newest errors and derives the tile values. */
export function useLLMCallLogStats(): UseLLMCallLogStatsResult {
  const [stats, setStats] = useState<CallLogStats | null>(null);
  const [newestErrors, setNewestErrors] = useState<CallLogOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startOfToday = useRef<string>(computeStartOfToday());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayStats, recentErrors] = await Promise.all([
        fetchCallLogStats(startOfToday.current),
        fetchCallLogs({ limit: NEWEST_LOAD_LIMIT, only_errors: true }),
      ]);
      setStats(todayStats);
      setNewestErrors(recentErrors.items);

      // DLQ check – fetch dead entries for toast notification
      const deadEntriesResp = await fetchCallLogs({ limit: 20, retry_status: 'dead' });
      const deadEntries = deadEntriesResp.items;
      const seenAt = localStorage.getItem(DLQ_SEEN_KEY);
      const unseenDead = seenAt
        ? deadEntries.filter((e) => e.created_at > seenAt)
        : deadEntries;
      if (unseenDead.length > 0) {
        toast.warning(`${unseenDead.length} LLM-Tasks endgültig fehlgeschlagen`, {
          description: '→ DLQ-Bereich',
        });
      }
      localStorage.setItem(DLQ_SEEN_KEY, new Date().toISOString());
    } catch {
      setError('Fehler beim Laden der Statistik.');
    } finally {
      setLoading(false);
    }
  }, []);

  useMountOnce(load);

  return {
    tiles: {
      errorsToday: stats?.errors ?? 0,
      mostCommonErrorType: pickMostCommonErrorType(stats),
      affectedTasks: countAffectedTasks(newestErrors),
    },
    stats,
    newestErrorAt: newestErrors[0]?.created_at ?? null,
    loading,
    error,
  };
}
