import { useCallback, useEffect, useRef, useState } from 'react';

import type { ObserverTicket } from '@src/features/observer/core/types';
import { fetchTickets } from '@src/features/observer/services/observerTicketService';

const POLL_INTERVAL_MS = 30_000;

/**
 *
 */
export function useObserverTickets() {
  const [tickets, setTickets] = useState<ObserverTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchTickets();
      setTickets(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Tickets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    intervalRef.current = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  return { tickets, isLoading, error, refetch: load };
}
