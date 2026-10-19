import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Bidirectional URL search parameter hook.
 *
 * Reads a URL param and returns a setter that updates it.
 * Other search params are preserved. When the value equals the default,
 * the param is removed from the URL for clean URLs.
 *
 * @example
 * // Tabs
 * const [tab, setTab] = useQueryParam('tab', 'models');
 * // URL: /admin?tab=models → setTab('providers') → /admin?tab=providers
 *
 * @example
 * // Filter
 * const [status, setStatus] = useQueryParam('status', 'all');
 * // URL: /items → setStatus('active') → /items?status=active
 * // URL: /items?status=active → setStatus('all') → /items
 *
 * @example
 * // Search
 * const [q, setQ] = useQueryParam('q', '');
 * // URL: /search → setQ('react') → /search?q=react
 * // URL: /search?q=react → setQ('') → /search
 */
export function useQueryParam(key: string, defaultValue: string): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => searchParams.get(key) ?? defaultValue, [searchParams, key, defaultValue]);

  const setValue = useCallback(
    (next: string) => {
      setSearchParams((prev) => {
        const copy = new URLSearchParams(prev);
        if (next === defaultValue || next === '') {
          copy.delete(key);
        } else {
          copy.set(key, next);
        }
        return copy;
      });
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}
