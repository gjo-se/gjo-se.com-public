import { useCallback, useMemo } from 'react';

import { useVisceraStore } from '../../store/visceraStore';

import type { VisceraStore } from '../../store/visceraStore';

// ── Module-level stable selectors (G7) ────────────────────────────────────

const selectSplitRatioAdr = (s: VisceraStore) => s.splitRatioAdr;
const selectSplitRatioYaml = (s: VisceraStore) => s.splitRatioYaml;

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook for split-ratio management via editorSlice (replaces localStorage).
 *
 * - Scope `'adr'`: AdrEditor split-ratio
 * - Scope `'yaml'`: VisceraEditorPage split-ratio
 *
 * Store uses 0–1 fraction; hook converts to/from 0–100 percentage for consumers.
 */
export function useEditorSplit(scope: 'adr' | 'yaml'): {
  ratio: number;
  setRatio: (value: number) => void;
} {
  const selector = useMemo(
    () => (scope === 'adr' ? selectSplitRatioAdr : selectSplitRatioYaml),
    [scope],
  );
  const fraction = useVisceraStore(selector);
  const setSplitRatio = useVisceraStore((s) => s.setSplitRatio);

  const setRatio = useCallback(
    (value: number) => {
      setSplitRatio(scope, value / 100);
    },
    [scope, setSplitRatio],
  );

  // Convert store fraction (0–1) → component percentage (0–100)
  return { ratio: fraction * 100, setRatio };
}
