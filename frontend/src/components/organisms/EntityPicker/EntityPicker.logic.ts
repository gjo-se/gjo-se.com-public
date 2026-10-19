import { useEffect, useMemo, useState } from 'react';

import { useDebounce } from '@src/hooks/useDebounce';

import type { EntityOption, SelectionMode } from './EntityPicker.types';

// ── Client-Side Filter ────────────────────────────────────────────────────────

/**
 * Filters options client-side by matching query against name, slug, category, and type.
 * Case-insensitive substring match.
 */
export function filterOptions(options: EntityOption[], query: string): EntityOption[] {
  if (!query) return options;
  const lower = query.toLowerCase();
  return options.filter(
    (opt) =>
      opt.name.toLowerCase().includes(lower) ||
      opt.slug.toLowerCase().includes(lower) ||
      (opt.category && opt.category.toLowerCase().includes(lower)) ||
      (opt.type && opt.type.toLowerCase().includes(lower)),
  );
}

// ── Toggle Logic ──────────────────────────────────────────────────────────────

/**
 * Toggles an entity key (slug) in the selected keys array.
 * - multi mode: adds if missing, removes if present.
 * - single mode: replaces with single-key array (or clears on re-click).
 */
export function toggleKey(
  key: string,
  selectedKeys: string[],
  mode: SelectionMode,
): string[] {
  if (mode === 'single') {
    return selectedKeys.includes(key) ? [] : [key];
  }
  return selectedKeys.includes(key)
    ? selectedKeys.filter((k) => k !== key)
    : [...selectedKeys, key];
}

// ── Grouping ──────────────────────────────────────────────────────────────────

/**
 * Groups options by `category` property.
 * Options without a category are placed into "Allgemein".
 */
export function useEntityGroups(options: EntityOption[]): Map<string, EntityOption[]> {
  return useMemo(() => {
    const groups = new Map<string, EntityOption[]>();
    options.forEach((opt) => {
      const cat = opt.category || 'Allgemein';
      const list = groups.get(cat);
      if (list) list.push(opt);
      else groups.set(cat, [opt]);
    });
    return groups;
  }, [options]);
}

// ── Typeahead Search Hook ─────────────────────────────────────────────────────

/**
 * Typeahead hook for server-side search (e.g. Technology empty-start-list mode).
 * Only triggers when query length >= 2 characters.
 *
 * Uses the pattern from TagPicker.logic.ts: setState calls live inside async
 * functions to avoid react-hooks/set-state-in-effect violations.
 */
export function useTypeaheadSearch(
  query: string,
  onSearch?: (query: string) => Promise<EntityOption[]>,
): { results: EntityOption[]; loading: boolean } {
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!onSearch || debouncedQuery.length < 2) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await onSearch!(debouncedQuery);
        if (!cancelled) {
          setResults(data);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, onSearch]);

  // Derive effective results: empty when no onSearch or query too short.
  const effectiveResults = !onSearch || debouncedQuery.length < 2 ? [] : results;

  return { results: effectiveResults, loading };
}
