import { fetchCoreStatuses, type CoreStatusOut } from '@src/lib/api/coreCatalog';

/** Module-level cache: statusableType → sorted statuses (fetched once). */
const cache = new Map<string, CoreStatusOut[]>();
const pending = new Map<string, Promise<CoreStatusOut[]>>();

/**
 * Fetch scoped statuses once per type. Subsequent calls return the cached result.
 * Shared between StatusCell and StatusFilter.
 */
export function fetchStatusesOnce(type: string): Promise<CoreStatusOut[]> {
  if (cache.has(type)) return Promise.resolve(cache.get(type)!);
  if (pending.has(type)) return pending.get(type)!;
  const promise = fetchCoreStatuses(undefined, type).then((data) => {
    const sorted = [...data].sort((a, b) => a.sort_order - b.sort_order);
    cache.set(type, sorted);
    pending.delete(type);
    return sorted;
  });
  pending.set(type, promise);
  return promise;
}

/** Synchronously get cached statuses (or undefined if not yet loaded). */
export function getCachedStatuses(type: string): CoreStatusOut[] | undefined {
  return cache.get(type);
}

/** Check if a type is already cached. */
export function hasCachedStatuses(type: string): boolean {
  return cache.has(type);
}
