/**
 * useEntityCache – Module-level entity cache hook for Tags, Status, and Technologies.
 *
 * Loads all three entity types in parallel via Promise.all on first call.
 * Uses a dedup-pending-promise pattern (analog statusCache.ts) so multiple
 * concurrent callers share a single fetch.
 *
 * Cache is invalidated via invalidateEntityCache(), triggered by YAML-write events
 * from useYamlWrite (Increment 2).
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import type { CoreTagOut, CoreStatusOut } from '@src/lib/api/coreCatalog';
import { fetchCoreTags, fetchCoreStatuses } from '@src/lib/api/coreCatalog';
import { fetchTechnologies } from '@src/lib/api/technologyCatalog';
import type { TechnologyCatalogEntry } from '@src/lib/api/technologyCatalogTypes';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Common denominator for all cacheable entities. */
export interface EntityData {
  slug: string;
  name: string;
  colorToken: string;
  category?: string;
  sortOrder?: number;
}

export type EntityType = 'tag' | 'status' | 'technology';

export interface UseEntityCacheResult {
  /** Map of slug → EntityData for tags. */
  tagMap: Map<string, EntityData>;
  /** Map of slug → EntityData for statuses. */
  statusMap: Map<string, EntityData>;
  /** Map of slug → EntityData for technologies. */
  technologyMap: Map<string, EntityData>;
  loading: boolean;
  error: string | null;
  /** Invalidate one or all caches. Call after YAML-write / data mutation. */
  invalidate: (entityType?: EntityType) => void;
}

// ── Module-Level Cache ─────────────────────────────────────────────────────────

const tagCache = new Map<string, EntityData>();
const statusCacheLocal = new Map<string, EntityData>();
const technologyCache = new Map<string, EntityData>();

/** Dedup: multiple concurrent callers share a single fetch. */
let pendingPromise: Promise<void> | null = null;

/** Subscribers notified when cache state changes (load completes, error, invalidate). */
const listeners = new Set<() => void>();

/** Clears one or all entity caches. Subsequent useEntityCache calls will re-fetch. */
export function invalidateEntityCache(entityType?: EntityType): void {
  switch (entityType) {
    case 'tag':
      tagCache.clear();
      break;
    case 'status':
      statusCacheLocal.clear();
      break;
    case 'technology':
      technologyCache.clear();
      break;
    default:
      tagCache.clear();
      statusCacheLocal.clear();
      technologyCache.clear();
  }
  notify();
}

/** All caches populated? */
function isFullyCached(): boolean {
  return tagCache.size > 0 && statusCacheLocal.size > 0 && technologyCache.size > 0;
}

function loadOnceCore(): Promise<void> {
  if (isFullyCached()) return Promise.resolve();
  if (pendingPromise) return pendingPromise;

  notify(); // trigger loading state re-render

  pendingPromise = Promise.all([
    fetchCoreTags(),
    fetchCoreStatuses(),
    fetchTechnologies(),
  ])
    .then(([tags, statuses, technologies]) => {
      if (tagCache.size === 0) {
        tags.forEach((tag) => {
          tagCache.set(tag.slug, normalizeTag(tag));
        });
      }
      if (statusCacheLocal.size === 0) {
        statuses.forEach((status) => {
          statusCacheLocal.set(status.slug, normalizeStatus(status));
        });
      }
      if (technologyCache.size === 0) {
        technologies.forEach((tech) => {
          technologyCache.set(tech.slug, normalizeTechnology(tech));
        });
      }
      notify();
    })
    .catch((err: unknown) => {
      console.error('[useEntityCache] Fetch failed:', err);
      notify();
      throw err;
    })
    .finally(() => {
      pendingPromise = null;
    });

  return pendingPromise;
}

// ── Normalizers ────────────────────────────────────────────────────────────────

function normalizeStatus(status: CoreStatusOut): EntityData {
  return {
    slug: status.slug,
    name: status.name,
    colorToken: status.color_token,
    category: status.category,
    sortOrder: status.sort_order,
  };
}

function normalizeTag(tag: CoreTagOut): EntityData {
  return {
    slug: tag.slug,
    name: tag.name,
    colorToken: tag.color_token,
    category: tag.category,
    sortOrder: tag.sort_order,
  };
}

function normalizeTechnology(tech: TechnologyCatalogEntry): EntityData {
  return {
    slug: tech.slug,
    name: tech.name,
    colorToken: tech.color_token,
    category: tech.type ?? undefined,
    sortOrder: 0,
  };
}

function notify(): void {
  listeners.forEach((fn) => {
    fn();
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Loads Tags, Status and Technologies in parallel (once per session).
 *
 * Pattern: Module-Level Cache + Dedup-Pending-Promise (analog statusCache.ts).
 * Call `invalidateEntityCache()` after YAML-write to force re-fetch.
 */
export function useEntityCache(): UseEntityCacheResult {
  const mountRef = useRef(false);
  const [renderCount, forceRender] = useReducer((v: number) => v + 1, 0);
  const [error, setError] = useState<string | null>(null);

  // Derived from module-level state.
  const loading = !isFullyCached() || pendingPromise !== null;

  // Subscribe to cache change notifications.
  useEffect(() => {
    const listener = () => forceRender();
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // Trigger initial load once per component mount.
  useEffect(() => {
    if (mountRef.current) return;
    mountRef.current = true;

    if (isFullyCached()) return;

    loadOnceCore().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load entity cache');
    });
  }, []);

  const invalidate = useCallback((entityType?: EntityType) => {
    invalidateEntityCache(entityType);

    loadOnceCore().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load entity cache');
    });
  }, []);

  // Snapshot-Maps: die Modul-Maps werden in-place mutiert (gleiche Referenz).
  // Ohne neue Map-Referenz würden Konsumenten mit `useMemo(..., [map])`
  // (z.B. statusOptions, StatusBorder-default) nie neu berechnen, sobald die
  // Daten nachgeladen sind. `renderCount` ändert sich bei Load/Invalidate und
  // wird als Recompute-Trigger referenziert.
  const tagMap = useMemo(() => {
    void renderCount;
    return new Map(tagCache);
  }, [renderCount]);
  const statusMap = useMemo(() => {
    void renderCount;
    return new Map(statusCacheLocal);
  }, [renderCount]);
  const technologyMap = useMemo(() => {
    void renderCount;
    return new Map(technologyCache);
  }, [renderCount]);

  return {
    tagMap,
    statusMap,
    technologyMap,
    loading,
    error,
    invalidate,
  };
}
