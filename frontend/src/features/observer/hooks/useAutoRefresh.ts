import { useQuery, type UseQueryResult } from '@tanstack/react-query';

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Thin wrapper around `useQuery` that auto-refreshes every `intervalMs`
 * and pauses when the browser tab is hidden (``document.hidden``).
 */
export function useAutoRefresh<T>(
  queryKey: string[],
  fetcher: () => Promise<T>,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): UseQueryResult<T> {
  return useQuery<T>({
    queryKey,
    queryFn: fetcher,
    staleTime: intervalMs,
    refetchInterval: () => (document.hidden ? false : intervalMs),
  });
}
