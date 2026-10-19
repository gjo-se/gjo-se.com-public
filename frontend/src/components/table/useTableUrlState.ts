import { useCallback, useEffect, useState } from 'react';

import { defaultExtra, parseParam, restoreExtra, serializeParam } from './tableParamRegistry';

// ── Defaults (no magic numbers) ──────────────────────────────────────────

const DEFAULT_ORDER: 'asc' | 'desc' = 'desc';
const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;

const knownParams = new Set(['q', 'sort', 'order', 'page', 'size', 'activeId']);

const storageKeyPrefix = 'table-state:';

/** Stable empty registry so callers without extra params get one reference. */
const EMPTY_REGISTRY: TableParamRegistry = {};

// ── Types ────────────────────────────────────────────────────────────────

interface FullState {
  known: TableUrlState
  extra: TableExtraParams
}

export type TableExtraParams = Record<string, unknown>;

export type TableParamRegistry = Record<string, TableParamSpec>;

/**
 * Definition of an additional, table-specific URL parameter.
 * `parse` maps a raw URL string to the typed value (identity/string by default);
 * `serialize` maps the typed value back to a URL string (String() by default).
 * A value equal to the serialized default is omitted from the URL for clean URLs.
 */
export interface TableParamSpec<V = unknown> {
  default: V
  parse?: (raw: string) => V
  serialize?: (value: V) => string | undefined
}

interface TableUrlState {
  q: string
  sort: string
  order: 'asc' | 'desc'
  page: number
  size: number
  activeId: string
}

interface UseTableUrlStateReturn extends TableUrlState {
  params: TableExtraParams
  setQ: (value: string) => void
  setSort: (sort: string, order?: 'asc' | 'desc') => void
  setPage: (page: number) => void
  setSize: (size: number) => void
  setActiveId: (id: string) => void
  setParam: (name: string, value: unknown) => void
  resetUrlState: () => void
}

// ── Module helpers (alphabetical) ─────────────────────────────────────────

/**
 * Builds the URLSearchParams for the given state. Params owned by other hook
 * instances (neither known nor in this registry) are preserved. Default values
 * are omitted to keep URLs clean.
 */
function buildSearchParams(
  known: TableUrlState,
  extra: TableExtraParams,
  registry: TableParamRegistry,
): URLSearchParams {
  const registryKeys = new Set(Object.keys(registry));
  const params = new URLSearchParams();
  readSearchParams().forEach((value, key) => {
    if (!knownParams.has(key) && !registryKeys.has(key)) params.set(key, value);
  });
  if (known.q) params.set('q', known.q);
  if (known.sort) params.set('sort', known.sort);
  if (known.order && known.order !== DEFAULT_ORDER) params.set('order', known.order);
  if (known.page !== DEFAULT_PAGE) params.set('page', String(known.page));
  if (known.size !== DEFAULT_SIZE) params.set('size', String(known.size));
  if (known.activeId) params.set('activeId', known.activeId);
  Object.entries(registry).forEach(([name, spec]) => {
    const serialized = serializeParam(spec, extra[name]);
    if (serialized !== undefined) params.set(name, serialized);
  });
  return params;
}

function defaultKnown(): TableUrlState {
  return { q: '', sort: '', order: DEFAULT_ORDER, page: DEFAULT_PAGE, size: DEFAULT_SIZE, activeId: '' };
}

/** Shallow value comparison of known + extra params for the sync bail-out. */
function isSameState(a: FullState, b: FullState): boolean {
  const k1 = a.known;
  const k2 = b.known;
  const knownEqual =
    k1.q === k2.q &&
    k1.sort === k2.sort &&
    k1.order === k2.order &&
    k1.page === k2.page &&
    k1.size === k2.size &&
    k1.activeId === k2.activeId;
  const keys = new Set([...Object.keys(a.extra), ...Object.keys(b.extra)]);
  const extraEqual = Array.from(keys).every((key) => a.extra[key] === b.extra[key]);
  return knownEqual && extraEqual;
}

/** Writes params to the URL and notifies sibling instances via a custom event. */
function pushState(params: URLSearchParams): void {
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new CustomEvent('tablestatechange'));
}

/**
 * Reads the persisted list state for a tableKey from localStorage.
 *
 * Returns the raw record (known params + registry params) or null when nothing
 * is stored. Usable outside of a hook context, e.g. to reconstruct the list
 * origin of a detail view on a direct deep-link.
 *
 * @param tableKey - Same key used in useTableUrlState, e.g. "projects"
 */
export function readPersistedTableState(tableKey: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(`${storageKeyPrefix}${tableKey}`);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/** Restores only managed known params from a localStorage record (no foreign params like `tab`). */
function restoreKnown(record: Record<string, string>): TableUrlState {
  return {
    q: record.q ?? '',
    sort: record.sort ?? '',
    order: (record.order as 'asc' | 'desc') ?? DEFAULT_ORDER,
    page: parseInt(record.page ?? '', 10) || DEFAULT_PAGE,
    size: parseInt(record.size ?? '', 10) || DEFAULT_SIZE,
    activeId: record.activeId ?? '',
  };
}

/**
 * Serializes only the state managed by useTableUrlState (known + extra) into a
 * record suitable for localStorage. Foreign params (e.g. `tab` from useQueryParam)
 * are excluded so they are never persisted or restored by this hook.
 */
function stateToRecord(
  known: TableUrlState,
  extra: TableExtraParams,
  registry: TableParamRegistry,
): Record<string, string> {
  const record: Record<string, string> = {};
  if (known.q) record.q = known.q;
  if (known.sort) record.sort = known.sort;
  if (known.order && known.order !== DEFAULT_ORDER) record.order = known.order;
  if (known.page !== DEFAULT_PAGE) record.page = String(known.page);
  if (known.size !== DEFAULT_SIZE) record.size = String(known.size);
  if (known.activeId) record.activeId = known.activeId;
  Object.entries(registry).forEach(([name, spec]) => {
    const serialized = serializeParam(spec, extra[name]);
    if (serialized !== undefined) record[name] = serialized;
  });
  return record;
}

/**
 * Synchronously writes activeId into the current URL history entry and the
 * localStorage snapshot before any React Router navigation. Usable outside of a
 * hook context (e.g. inside column cell definitions).
 *
 * @param tableKey - Same key used in useTableUrlState, e.g. "projects"
 * @param id       - Entity id to mark as active, or "" to clear
 */
export function syncActiveIdToUrl(tableKey: string, id: string): void {
  const params = readSearchParams();
  if (id) {
    params.set('activeId', id);
  } else {
    params.delete('activeId');
  }
  const search = params.toString();
  window.history.replaceState(null, '', search ? `${window.location.pathname}?${search}` : window.location.pathname);
  try {
    // Only persist managed params — foreign params (e.g. `tab`) must not leak into localStorage
    const known = restoreKnown(Object.fromEntries(params));
    const record = stateToRecord(known, {}, EMPTY_REGISTRY);
    if (Object.keys(record).length === 0) {
      localStorage.removeItem(`${storageKeyPrefix}${tableKey}`);
    } else {
      localStorage.setItem(`${storageKeyPrefix}${tableKey}`, JSON.stringify(record));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Syncs all list parameters with the URL as the single source of truth.
 *
 * The URL owns every parameter (known q/sort/order/page/size/activeId plus any
 * registry-defined param). Persistence is a single localStorage snapshot per
 * tableKey holding all current URL params, enabling a three-layer strategy:
 *   Mount:  URL present → use it; URL empty → restore from localStorage → URL
 *   Change: update URL via replaceState + rewrite the localStorage snapshot
 *   Reset:  clear the URL + remove the localStorage key (all params)
 *
 * Multiple instances may share a tableKey with different registries; they stay
 * in sync via the "tablestatechange" event and preserve each other's params.
 * Pass a stable (module-level) registry so callbacks stay referentially stable.
 *
 * @param tableKey     - Unique table identifier, defaults to the pathname.
 * @param extraParams  - Registry of additional table-specific parameters.
 */
export function useTableUrlState(
  tableKey?: string,
  extraParams: TableParamRegistry = EMPTY_REGISTRY,
): UseTableUrlStateReturn {
  const effectiveKey = tableKey ?? window.location.pathname;
  const storageKey = `${storageKeyPrefix}${effectiveKey}`;

  const parseAll = useCallback((): FullState => {
    const params = readSearchParams();
    const known: TableUrlState = {
      q: params.get('q') ?? '',
      sort: params.get('sort') ?? '',
      order: (params.get('order') as 'asc' | 'desc') ?? DEFAULT_ORDER,
      page: parseInt(params.get('page') ?? '', 10) || DEFAULT_PAGE,
      size: parseInt(params.get('size') ?? '', 10) || DEFAULT_SIZE,
      activeId: params.get('activeId') ?? '',
    };
    const extra: TableExtraParams = {};
    Object.entries(extraParams).forEach(([name, spec]) => {
      extra[name] = parseParam(spec, params.get(name));
    });
    return { known, extra };
  }, [extraParams]);

  const initState = (): FullState => {
    if (readSearchParams().toString()) return parseAll();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const record = JSON.parse(stored) as Record<string, string>;
        const known = restoreKnown(record);
        const extra = restoreExtra(record, extraParams);
        const params = buildSearchParams(known, extra, extraParams);
        if (params.toString()) {
          pushState(params);
          return { known, extra };
        }
      }
    } catch {
      // ignore corrupt storage
    }
    return { known: defaultKnown(), extra: defaultExtra(extraParams) };
  };

  const [state, setState] = useState<FullState>(initState);

  const persist = useCallback(
    (next: FullState) => {
      pushState(buildSearchParams(next.known, next.extra, extraParams));
      try {
        const record = stateToRecord(next.known, next.extra, extraParams);
        if (Object.keys(record).length === 0) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(record));
        }
      } catch {
        // ignore storage errors
      }
    },
    [storageKey, extraParams],
  );

  useEffect(() => {
    persist(state);
  }, [state, persist]);

  // Cross-instance sync: when a sibling instance writes to the URL, re-read
  // state to keep every instance consistent. A value-based bail-out prevents
  // the persist → event → persist loop.
  useEffect(() => {
    const handleUrlChange = () => {
      const next = parseAll();
      setState((prev) => (isSameState(prev, next) ? prev : next));
    };
    window.addEventListener('tablestatechange', handleUrlChange);
    return () => window.removeEventListener('tablestatechange', handleUrlChange);
  }, [parseAll]);

  const setQ = useCallback((value: string) => {
    setState((prev) => ({ ...prev, known: { ...prev.known, q: value, page: DEFAULT_PAGE } }));
  }, []);

  const setSort = useCallback((sort: string, order: 'asc' | 'desc' = 'asc') => {
    setState((prev) => ({ ...prev, known: { ...prev.known, sort, order, page: DEFAULT_PAGE } }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, known: { ...prev.known, page } }));
  }, []);

  const setSize = useCallback((size: number) => {
    setState((prev) => ({ ...prev, known: { ...prev.known, size, page: DEFAULT_PAGE } }));
  }, []);

  /**
   * Synchronously updates activeId in URL and localStorage before navigation.
   * Using setState alone is async – replaceState would fire after React Router
   * already pushed a new history entry, overwriting the wrong entry.
   */
  const setActiveId = useCallback(
    (id: string) => {
      syncActiveIdToUrl(effectiveKey, id);
      setState((prev) => ({ ...prev, known: { ...prev.known, activeId: id } }));
    },
    [effectiveKey],
  );

  const setParam = useCallback((name: string, value: unknown) => {
    setState((prev) => ({ ...prev, extra: { ...prev.extra, [name]: value } }));
  }, []);

  const resetUrlState = useCallback(() => {
    pushState(new URLSearchParams());
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore storage errors
    }
    setState({ known: defaultKnown(), extra: defaultExtra(extraParams) });
  }, [storageKey, extraParams]);

  return {
    ...state.known,
    params: state.extra,
    setQ,
    setSort,
    setPage,
    setSize,
    setActiveId,
    setParam,
    resetUrlState,
  };
}
