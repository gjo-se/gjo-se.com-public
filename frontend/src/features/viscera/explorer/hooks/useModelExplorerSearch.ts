import Fuse from 'fuse.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useModelExplorer } from './useModelExplorer';

import type { ModelObject } from './useModelExplorer';

// ── Constants ─────────────────────────────────────────────────────────────────

export const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'system', label: 'Systems' },
  { value: 'container', label: 'Containers' },
  { value: 'component', label: 'Components' },
  { value: 'person', label: 'Persons' },
] as const;

type TypeFilterValue = (typeof TYPE_FILTER_OPTIONS)[number]['value'];

export const PARENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All objects' },
  { value: 'withParent', label: 'With parent' },
  { value: 'withoutParent', label: 'Without parent' },
] as const;

export type ParentFilterValue = (typeof PARENT_FILTER_OPTIONS)[number]['value'];

const FUSE_OPTIONS = {
  keys: ['name', 'id', 'description'],
  threshold: 0.3,
  minMatchCharLength: 1,
};

// ── Return Type ───────────────────────────────────────────────────────────────

export interface UseModelExplorerSearchResult {
  query: string;
  typeFilter: TypeFilterValue;
  parentFilter: ParentFilterValue;
  filtered: ModelObject[];
  handleSearch: (q: string) => void;
  setTypeFilter: (value: TypeFilterValue) => void;
  setParentFilter: (value: ParentFilterValue) => void;
  allObjects: ModelObject[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Combined search and filter hook for the Model Explorer.
 *
 * Encapsulates Fuse.js fuzzy search (150ms debounce), type filter buttons
 * (All / Systems / Containers / Components / Persons), and parent filter
 * dropdown (All / With parent / Without parent) in a single hook.
 *
 * Uses `useModelExplorer()` (G1 golden) as the data source.
 */
export function useModelExplorerSearch(): UseModelExplorerSearchResult {
  const { allObjects } = useModelExplorer();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [parentFilter, setParentFilter] = useState<ParentFilterValue>('all');
  const fuseRef = useRef<Fuse<ModelObject> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<ModelObject[] | null>(null);

  // ── Fuse index ──────────────────────────────────────────────────────────

  useEffect(() => {
    fuseRef.current = new Fuse(allObjects, FUSE_OPTIONS);
  }, [allObjects]);

  // ── Search handler (debounced) ──────────────────────────────────────────

  const handleSearch = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!q.trim()) {
      setSearchResults(null);
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (!fuseRef.current) return;
      const results = fuseRef.current.search(q.trim());
      setSearchResults(results.map((r) => r.item));
    }, 150);
  }, []);

  // ── Cleanup debounce on unmount ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Derived: apply type and parent filters ─────────────────────────────

  const filtered = useMemo(() => {
    const base = searchResults ?? allObjects;

    return base.filter((obj) => {
      if (typeFilter !== 'all' && obj.type !== typeFilter) return false;

      if (parentFilter === 'withParent' && !obj.parentId) return false;
      if (parentFilter === 'withoutParent' && obj.parentId) return false;

      return true;
    });
  }, [allObjects, searchResults, typeFilter, parentFilter]);

  return {
    query,
    typeFilter,
    parentFilter,
    filtered,
    handleSearch,
    setTypeFilter,
    setParentFilter,
    allObjects,
  };
}
