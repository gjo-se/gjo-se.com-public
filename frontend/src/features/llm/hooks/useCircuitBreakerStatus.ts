/**
 * Hook: Pollt den Circuit-Breaker-Status und liefert OPEN-Provider für Warnungen.
 *
 * @module useCircuitBreakerStatus
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  fetchCircuitBreakers,
  resetCircuitBreaker,
  type CircuitBreakerStatus,
} from '@src/features/llm/services/circuitBreakerService';

/** Poll-Intervall in Millisekunden (nur bei OPEN/HALF_OPEN aktiv). */
const POLL_INTERVAL_MS = 30_000;

export interface UseCircuitBreakerStatusResult {
  /** Alle Circuit-Breaker-Status (leeres Array bei Lade- oder Fehlerzustand). */
  breakers: CircuitBreakerStatus[];
  /** Lädt die Status manuell neu. */
  refresh: () => void;
  /** Setzt einen Circuit Breaker manuell zurück und zeigt Erfolgs-Toast. */
  handleReset: (providerKey: string) => Promise<void>;
}

/**
 * Pollt den Circuit Breaker Status und warnt per Toast bei OPEN-Providern.
 *
 * Der Poll ist nur aktiv, wenn mindestens ein Provider OPEN oder HALF_OPEN ist.
 * Toast-Warnungen erscheinen einmal pro Provider-Session.
 */
export function useCircuitBreakerStatus(): UseCircuitBreakerStatusResult {
  const [breakers, setBreakers] = useState<CircuitBreakerStatus[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnedKeysRef = useRef<Set<string>>(new Set());

  const handleSingleToast = useCallback((cb: CircuitBreakerStatus) => {
    if (warnedKeysRef.current.has(cb.provider_key)) return;
    warnedKeysRef.current.add(cb.provider_key);
    toast.error(`Circuit Breaker: ${cb.provider_key} blockiert`, {
      description: `${cb.cooldown_seconds}s Cooldown – manuell zurücksetzbar`,
      action: {
        label: 'Zurücksetzen',
        onClick: async () => {
          try {
            await resetCircuitBreaker(cb.provider_key);
            toast.success(`Circuit Breaker ${cb.provider_key} zurückgesetzt`);
          } catch {
            toast.error(`Fehler beim Zurücksetzen von ${cb.provider_key}`);
          }
        },
      },
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchCircuitBreakers();
      setBreakers(data);

      data.forEach((cb) => {
        if (cb.state === 'OPEN') {
          handleSingleToast(cb);
        } else {
          warnedKeysRef.current.delete(cb.provider_key);
        }
      });
    } catch {
      // Silent fail – UI zeigt leere Liste
    }
  }, [handleSingleToast]);

  /** Beim Mounten laden, beim Unmounten Intervall clearen. */
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const data = await fetchCircuitBreakers();
        if (!cancelled) {
          setBreakers(data);
          data.forEach((cb) => {
            if (cb.state === 'OPEN') {
              handleSingleToast(cb);
            } else {
              warnedKeysRef.current.delete(cb.provider_key);
            }
          });
        }
      } catch {
        // Silent fail
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [handleSingleToast]);

  /** Poll starten/stoppen je nachdem ob OPEN/HALF_OPEN vorhanden. */
  useEffect(() => {
    const hasActive = breakers.some(
      (cb: CircuitBreakerStatus) => cb.state === 'OPEN' || cb.state === 'HALF_OPEN',
    );
    if (hasActive && intervalRef.current === null) {
      intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    } else if (!hasActive && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [breakers, load]);

  const handleReset = useCallback(
    async (providerKey: string) => {
      await resetCircuitBreaker(providerKey);
      toast.success(`Circuit Breaker ${providerKey} zurückgesetzt`);
      await load();
    },
    [load],
  );

  return { breakers, refresh: load, handleReset };
}
