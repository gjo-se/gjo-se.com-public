/**
 * useContactToken – Holt beim Mount einen kurzlebigen, server-signierten
 * Form-Token (Spamschutz) und stellt einen Reload für den Retry-Pfad bereit.
 *
 * Kein Store: reiner Request-State, den die ContactForm-Komponente über den
 * Hook bezieht (siehe fe-architecture, Hook-Konventionen).
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchContactToken } from '../services/contactService';

export interface UseContactTokenReturn {
  /** Signierter Token oder `null`, solange er noch nicht geladen ist. */
  token: string | null;
  /** True, wenn das Laden des Tokens fehlgeschlagen ist. */
  error: boolean;
  /** Holt den Token erneut (z. B. nach Ablauf im Retry-Pfad). */
  reload: () => void;
}

/**
 * Lädt den Form-Token beim Mount und bei jedem `reload()`.
 */
export function useContactToken(): UseContactTokenReturn {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const fresh = await fetchContactToken();
        if (cancelled) return;
        setToken(fresh);
        setError(false);
      } catch (err) {
        if (cancelled) return;
        console.error('contact: token fetch failed', err);
        setError(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  const reload = useCallback(() => {
    setReloadCount((count) => count + 1);
  }, []);

  return { token, error, reload };
}
