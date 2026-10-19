import { produce } from 'immer';

import { PARAM_FOCUS, PARAM_HIDE, parseBadgeParams } from './persistUrlCodec';

import type { BadgeState } from '../filterSlice';
import type { VisceraStore } from '../visceraStore';
import type { StoreApi } from 'zustand';

/**
 * Re-sync filter badge states from the current URL.
 *
 * Called on every SPA page mount to ensure badge states match the URL.
 * If the URL has focus/hide params, they are applied. If the URL has
 * neither focus nor hide, all badge states are reset to neutral AND
 * focus/hide params are removed from the URL.
 *
 * Uses direct setState (not actions) to avoid intermediate URL writes.
 */
export function syncFilterFromUrl(store: StoreApi<VisceraStore>): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const focusRaw = params.get(PARAM_FOCUS);
  const hideRaw = params.get(PARAM_HIDE);

  const focusBadges = focusRaw ? parseBadgeParams(focusRaw) : [];
  const hideBadges = hideRaw ? parseBadgeParams(hideRaw) : [];

  store.setState(
    produce((state: VisceraStore) => {
      state.badgeStates.clear();

      focusBadges.forEach(({ type, slug }) => {
        const key = `${type}:${slug}`;
        state.badgeStates.set(key, { entityType: type, slug, state: 'focus' } as BadgeState);
      });
      hideBadges.forEach(({ type, slug }) => {
        const key = `${type}:${slug}`;
        state.badgeStates.set(key, { entityType: type, slug, state: 'hide' } as BadgeState);
      });

      let count = 0;
      state.badgeStates.forEach((badge) => {
        if (badge.state !== 'neutral') count += 1;
      });
      state.activeFilterCount = count;
    }),
  );

  // Clean up stale focus/hide URL params when none are needed
  if (focusBadges.length === 0 && hideBadges.length === 0) {
    const next = new URL(window.location.href);
    let changed = false;
    if (next.searchParams.has(PARAM_FOCUS)) {
      next.searchParams.delete(PARAM_FOCUS);
      changed = true;
    }
    if (next.searchParams.has(PARAM_HIDE)) {
      next.searchParams.delete(PARAM_HIDE);
      changed = true;
    }
    if (changed) {
      window.history.replaceState(null, '', next.toString());
    }
  }
}
