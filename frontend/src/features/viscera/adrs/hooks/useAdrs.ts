/**
 * useAdrs – Laedt alle ADR-Dateien aus architecture/adr/.
 *
 * Datenfluss:
 *   1. virtual:adr-files → Dateiliste (Vite-Plugin, Build-Zeit)
 *   2. fetch() → Raw Markdown pro ADR (Runtime mit Polling)
 *   3. Frontmatter via js-yaml parsen
 *   4. Validierung gegen AdrFrontmatterSchema (Zod)
 *   5. Polling alle 2s (analog useWorkspace)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useWorkspace } from '../../core/useWorkspace';
import { loadAllAdrs } from '../../services/adrCatalogService';

import type { Diagram } from '../../core/workspaceSchema';
import type { Adr } from '../../services/adrFileService';

const POLLING_INTERVAL_MS = 2000;

// ── Re-exports (backward compat) ──────────────────────────────────────────

export { loadAllAdrs };
export type { Adr } from '../../services/adrFileService';

// ── Types ─────────────────────────────────────────────────────────────────

export interface UseAdrsResult {
  adrs: Adr[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  getById: (id: string) => Adr | undefined;
  allIds: string[];
  /** Pre-computed mapping: systemId → ADRs that reference this system via frontmatter.systems. */
  decisionsBySystem: Map<string, Adr[]>;
  /** Convenience: getDecisionsForSystem(id) = decisionsBySystem.get(id) ?? []. */
  getDecisionsForSystem: (systemId: string) => Adr[];
  /** Returns diagram key + resolved name (from workspace diagrams) for a given ADR. */
  getAdrDiagrams: (adr: Adr) => { key: string; name: string }[];
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook: Laedt alle ADRs aus architecture/adr/ mit 2s-Polling.
 * Parst Frontmatter via js-yaml, validiert gegen AdrFrontmatterSchema.
 */
export function useAdrs(): UseAdrsResult {
  const { workspace } = useWorkspace();
  const [adrs, setAdrs] = useState<Adr[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await loadAllAdrs();
      setAdrs(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const getById = useCallback(
    (id: string) => adrs.find((a) => a.idString === id),
    [adrs],
  );

  const allIds = useMemo(() => adrs.map((a) => a.idString), [adrs]);

  const decisionsBySystem = useMemo(() => {
    const map = new Map<string, Adr[]>();
    adrs.forEach((adr) => {
      adr.systems.forEach((system) => {
        const key = system.toLowerCase();
        const list = map.get(key);
        if (list) {
          list.push(adr);
        } else {
          map.set(key, [adr]);
        }
      });
    });
    return map;
  }, [adrs]);

  const getDecisionsForSystem = useCallback(
    (systemId: string) => decisionsBySystem.get(systemId.toLowerCase()) ?? [],
    [decisionsBySystem],
  );

  const getAdrDiagrams = useCallback(
    (adr: Adr) => {
      const diagrams = (workspace?.diagrams ?? []) as Diagram[];
      return adr.diagrams.map((key) => ({
        key,
        name: diagrams.find((d) => d.key === key)?.name ?? key,
      }));
    },
    [workspace],
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    void load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => void load(), POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return {
    adrs,
    loading,
    error,
    reload: () => void load(),
    getById,
    allIds,
    decisionsBySystem,
    getDecisionsForSystem,
    getAdrDiagrams,
  };
}
