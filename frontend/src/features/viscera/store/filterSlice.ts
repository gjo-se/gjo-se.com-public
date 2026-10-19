import { produce } from 'immer';

import type { VisceraStore } from './visceraStore';
import type { StateCreator } from 'zustand';

// ── Types (canonical home – re-exported via usePerspectiveState for compat) ───

/** State of a single badge identified by entityType + slug. */
export interface BadgeState {
  entityType: EntityType;
  slug: string;
  state: BadgeToggleState;
}

/** Three-state toggle for badge filtering: Neutral→Focus→Hide→Neutral. */
export type BadgeToggleState = 'neutral' | 'focus' | 'hide';

/** Discriminated entity type matching the EntityPicker/EntityCache domain. */
export type EntityType = 'tag' | 'status' | 'technology';

// ── Constants ────────────────────────────────────────────────────────────────

const CYCLE: Record<BadgeToggleState, BadgeToggleState> = {
  neutral: 'focus',
  focus: 'hide',
  hide: 'neutral',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export interface FilterSlice {
  /** Active badge states keyed by `${entityType}:${slug}`. */
  badgeStates: Map<string, BadgeState>;
  /** Currently hovered badge key for transient focus preview, or null. */
  hoveredKey: string | null;
  /** Number of badges currently in a non-neutral state (derived). */
  activeFilterCount: number;
  /** Cycle a badge through Neutral→Focus→Hide→Neutral. */
  toggleBadge: (entityType: EntityType, slug: string) => void;
  /** Set transient hover focus for a badge (null clears hover). */
  setHover: (key: string | null) => void;
  /** Reset all badge states to neutral and clear URL params. */
  resetAll: () => void;
}

// NOTE: URL persistence for badgeStates is handled by persistUrl middleware.
// filterSlice no longer writes to the URL directly — persistUrl is the sole
// Store→URL write path for all mapped fields.

// ── Slice Interface ──────────────────────────────────────────────────────────

/** Build composite key from entityType and slug. */
export function badgeKey(entityType: EntityType, slug: string): string {
  return `${entityType}:${slug}`;
}

// ── Slice Factory ────────────────────────────────────────────────────────────

export const createFilterSlice: StateCreator<VisceraStore, [], [], FilterSlice> = (set) => ({
  badgeStates: new Map<string, BadgeState>(),
  hoveredKey: null,
  activeFilterCount: 0,

  toggleBadge: (entityType: EntityType, slug: string) =>
    set(
      produce((state: VisceraStore) => {
        const key = badgeKey(entityType, slug);
        const existing = state.badgeStates.get(key);
        const nextState: BadgeToggleState = existing
          ? CYCLE[existing.state]
          : CYCLE.neutral;

        if (nextState === 'neutral') {
          state.badgeStates.delete(key);
        } else {
          state.badgeStates.set(key, { entityType, slug, state: nextState });
        }

        // Derive activeFilterCount
        let count = 0;
        state.badgeStates.forEach((badge) => {
          if (badge.state !== 'neutral') count += 1;
        });
        state.activeFilterCount = count;

        // URL sync handled by persistUrl middleware
      }),
    ),

  setHover: (key: string | null) =>
    set(
      produce((state: VisceraStore) => {
        state.hoveredKey = key;
      }),
    ),

  resetAll: () =>
    set(
      produce((state: VisceraStore) => {
        state.badgeStates.clear();
        state.activeFilterCount = 0;
        // URL sync handled by persistUrl middleware
      }),
    ),
});
