import {
  selectBadgeStates,
  selectHoveredKey,
  selectActiveFilterCount,
} from '../../store/selectors';
import { useVisceraStore } from '../../store/visceraStore';

// ── Re-exports (types migrated to filterSlice.ts, re-exported for compat) ────

export type {
  BadgeState,
  BadgeToggleState,
} from '../../store/filterSlice';

/** @deprecated Use `BadgeState` from `../store/filterSlice` instead. */
export interface PerspectiveState {
  badgeStates: Map<string, import('../../store/filterSlice').BadgeState>;
  hoveredKey: string | null;
}

/** @deprecated Use VisceraStore (FilterSlice) directly. */
export interface UsePerspectiveStateResult {
  badgeStates: Map<string, import('../../store/filterSlice').BadgeState>;
  hoveredKey: string | null;
  toggleBadge: (entityType: import('../../store/filterSlice').EntityType, slug: string) => void;
  setHover: (key: string | null) => void;
  resetAll: () => void;
  activeFilterCount: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * **@deprecated** Use VisceraStore (FilterSlice) directly.
 *
 * Compatibility wrapper that delegates to the VisceraStore.
 * All filter state is now managed by `filterSlice.ts` – this hook
 * exists only to avoid breaking other consumers during migration.
 *
 * Migration path:
 * ```
 * // Before:
 * const { badgeStates, toggleBadge } = usePerspectiveState();
 *
 * // After:
 * const badgeStates = useVisceraStore(selectBadgeStates);
 * const toggleBadge = useVisceraStore((s) => s.toggleBadge);
 * ```
 */
export function usePerspectiveState(): UsePerspectiveStateResult {
  const badgeStates = useVisceraStore(selectBadgeStates);
  const hoveredKey = useVisceraStore(selectHoveredKey);
  const activeFilterCount = useVisceraStore(selectActiveFilterCount);
  const toggleBadge = useVisceraStore((s) => s.toggleBadge);
  const setHover = useVisceraStore((s) => s.setHover);
  const resetAll = useVisceraStore((s) => s.resetAll);

  return {
    badgeStates,
    hoveredKey,
    toggleBadge,
    setHover,
    resetAll,
    activeFilterCount,
  };
}
