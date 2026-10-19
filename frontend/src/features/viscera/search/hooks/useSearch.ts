import Fuse from 'fuse.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdrs } from '../../adrs/hooks/useAdrs';
import { useWorkspace } from '../../core/useWorkspace';
import { tagValues } from '../../core/workspaceSchema';

import type { Adr } from '../../adrs/hooks/useAdrs';
import type { ArchitectureObject, Flow } from '../../core/workspaceSchema';
import type { FuseResult, IFuseOptions } from 'fuse.js';

// ── Types ─────────────────────────────────────────────────────────────────

interface IndexEntry {
  type: SearchResult['type'];
  id: string;
  name: string;
  description: string;
  tags: string[];
  technologies: string[];
  viewKey?: string;
  sourcePath: string;
  adrId?: number;
  flowId?: string;
}

export interface SearchResult {
  type: 'system' | 'container' | 'component' | 'adr' | 'flow';
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  viewKey?: string;
  sourcePath: string;
  adrId?: number;
  flowId?: string;
  score?: number;
}

const FUSE_OPTIONS: IFuseOptions<IndexEntry> = {
  keys: ['name', 'description', 'tags', 'technologies'],
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 1,
};

const DEBOUNCE_MS = 300;

export interface UseSearchResult {
  results: SearchResult[];
  search: (q: string) => void;
  query: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolves the top-level system ID for a flat object:
 * system → own id, container → parent, component → parent of its parent
 * container (bounded two-hop lookup, mirrors the old nested viewKey).
 */
function resolveSystemId(objects: ArchitectureObject[], obj: ArchitectureObject): string {
  if (obj.type === 'component') {
    const container = objects.find((o) => o.id === obj.parent);
    return container?.parent ?? obj.parent ?? obj.id;
  }
  if (obj.type === 'container') {
    return obj.parent ?? obj.id;
  }
  return obj.id;
}

/**
 * Maps a flat object type to the search category.
 *
 * Mirrors the viewer's render dispatch: only ``container`` and
 * ``component`` get their own category — systems, stores and objects
 * without a type are indexed as ``system``.
 */
function searchTypeFor(type: string | undefined): SearchResult['type'] {
  if (type === 'container') return 'container';
  if (type === 'component') return 'component';
  return 'system';
}

// ── Hook ──────────────────────────────────────────────────────────────────

/** Builds and maintains a fuse.js index over workspace elements, ADRs, and flows. */
export function useSearch(): UseSearchResult {
  const { workspace } = useWorkspace();
  const { adrs } = useAdrs();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const fuseRef = useRef<Fuse<IndexEntry> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── Build index entries ───────────────────────────────────────────────

  const entries = useMemo<IndexEntry[]>(() => {
    const result: IndexEntry[] = [];

    if (!workspace) return result;

    const objects = workspace.objects ?? [];

    objects.forEach((obj) => {
      result.push({
        type: searchTypeFor(obj.type),
        id: obj.id,
        name: obj.name,
        description: obj.description ?? '',
        tags: tagValues(obj.tags),
        technologies: obj.technologies ?? [],
        viewKey: resolveSystemId(objects, obj),
        sourcePath: `nodes/${obj.id}.yml`,
      });
    });

    return result;
  }, [workspace]);

  const adrEntries = useMemo<IndexEntry[]>(() => {
    return adrs.map((adr: Adr): IndexEntry => ({
      type: 'adr' as const,
      id: adr.idString,
      name: adr.title,
      description: adr.status,
      tags: adr.tags,
      technologies: [],
      sourcePath: adr.filePath,
      adrId: typeof adr.id === 'number' ? adr.id : parseInt(adr.idString, 10),
    }));
  }, [adrs]);

  const flowEntries = useMemo<IndexEntry[]>(() => {
    const flows: Flow[] = workspace?.flows ?? [];
    return flows.map((flow: Flow): IndexEntry => ({
      type: 'flow' as const,
      id: flow.id,
      name: flow.title,
      description: flow.description ?? '',
      tags: flow.tags ?? [],
      technologies: [],
      sourcePath: 'workspace.yml',
      flowId: flow.id,
    }));
  }, [workspace]);

  const allEntries = useMemo<IndexEntry[]>(
    () => [...entries, ...adrEntries, ...flowEntries],
    [entries, adrEntries, flowEntries],
  );

  // ── Create / recreate Fuse index ───────────────────────────────────────

  useEffect(() => {
    fuseRef.current = new Fuse(allEntries, FUSE_OPTIONS);
  }, [allEntries]);

  // ── Debounced search ───────────────────────────────────────────────────

  const search = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!q.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (!fuseRef.current) return;
      const fuseResults: FuseResult<IndexEntry>[] = fuseRef.current.search(q.trim());
      setResults(
        fuseResults.map((r) => ({
          type: r.item.type,
          id: r.item.id,
          name: r.item.name,
          description: r.item.description || undefined,
          tags: r.item.tags.length > 0 ? r.item.tags : undefined,
          viewKey: r.item.viewKey,
          sourcePath: r.item.sourcePath,
          adrId: r.item.adrId,
          flowId: r.item.flowId,
          score: r.score,
        })),
      );
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { results, search, query };
}
