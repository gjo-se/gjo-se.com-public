import { useCallback, useEffect, useRef, useState } from 'react';

import type { Language } from '@src/contexts/LanguageContext';
import { fetchPublicSiteContent } from '@src/lib/api/siteContent';
import type { SiteContentData } from '@src/lib/api/siteContent';

interface UseContentResult {
  data: SiteContentData;
  loading: boolean;
  error: string | null;
}

// Module-level cache: one fetch per language, shared across all consumers.
const cache = new Map<string, SiteContentData>();
const pendingRequests = new Map<string, Promise<SiteContentData>>();

// localStorage persistence – lets repeat visits render localized copy on the
// very first paint (no placeholder flash). Entries expire after CACHE_TTL_MS so
// edited copy propagates without requiring a manual cache clear.
const STORAGE_PREFIX = 'gjose:site-content:';
const CACHE_TTL_MS = 5 * 60 * 1000;

interface PersistedContent {
  savedAt: number;
  data: SiteContentData;
}

async function fetchContentForLang(lang: string): Promise<SiteContentData> {
  const cached = getCachedContent(lang);
  if (cached) return cached;

  const pending = pendingRequests.get(lang);
  if (pending) return pending;

  const promise = fetchPublicSiteContent(lang)
    .then((data) => {
      cache.set(lang, data);
      persistContent(lang, data);
      return data;
    })
    .finally(() => {
      pendingRequests.delete(lang);
    });

  pendingRequests.set(lang, promise);
  return promise;
}

/** Freshest available content: in-memory first, then fresh persisted copy. */
function getCachedContent(lang: string): SiteContentData | undefined {
  const inMemory = cache.get(lang);
  if (inMemory) return inMemory;

  const persisted = readPersistedContent(lang);
  if (persisted) {
    cache.set(lang, persisted);
  }
  return persisted;
}

function persistContent(lang: string, data: SiteContentData): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: PersistedContent = { savedAt: Date.now(), data };
    window.localStorage.setItem(STORAGE_PREFIX + lang, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable (e.g. private mode) – caching is best-effort.
  }
}

function readPersistedContent(lang: string): SiteContentData | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + lang);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as PersistedContent;
    const isFresh = typeof parsed?.savedAt === 'number'
      && Date.now() - parsed.savedAt <= CACHE_TTL_MS;
    if (!isFresh || typeof parsed.data !== 'object' || parsed.data === null) {
      return undefined;
    }

    return parsed.data;
  } catch {
    return undefined;
  }
}

/**
 * useContent – fetches and caches localized site content for a language.
 * Each language is fetched once per session and cached module-wide, backed by a
 * short-lived localStorage copy so returning visitors skip the loading state.
 */
export function useContent(lang: Language): UseContentResult {
  const [data, setData] = useState<SiteContentData>(() => getCachedContent(lang) ?? {});
  const [loading, setLoading] = useState(() => !cache.has(lang));
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (cache.has(lang)) {
      setData(cache.get(lang)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchContentForLang(lang);
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Fehler beim Laden der Inhalte';
        setError(message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error };
}
