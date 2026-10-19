import { shallow } from 'zustand/shallow';

import type { VisceraStore } from '../visceraStore';
import type { StoreApi } from 'zustand';

const STORAGE_KEY = 'viscera_state';

// ═══════════════════════════════════════════════════════════════════════════════
// Unified Persist Schema (single localStorage key)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Persists ONLY UI preferences. Node positions are NOT persisted here — the
// diagram YAML `nodes` map is the single source of truth (Kanon R1, #2523).
// `nodeOverrides` stay transient in the Zustand store (live-drag only) and are
// never written to localStorage; a fresh instance reads exactly the curated
// file, so stale overrides can no longer override or corrupt it.
//
// {
//   "ui":     { "panelCollapsed": false },
//   "navigation": { "lastUrl": { "SystemLandscape": "/admin/viscera/views?zoom=1.5&x=100&y=200" } },
//   "editor": { "splitRatioAdr": 0.5, "splitRatioYaml": 0.5 }
// }

interface PersistedEditorState {
  splitRatioAdr?: number;
  splitRatioYaml?: number;
}

interface PersistedNavigationState {
  lastUrl?: Record<string, string>;
}

interface PersistedState {
  editor?: PersistedEditorState;
  ui: PersistedUIState;
  navigation: PersistedNavigationState;
}

interface PersistedUIState {
  panelCollapsed?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Hydrates the store from the unified `viscera_state` localStorage key.
 *
 * Called once at store creation time, before the first render.
 * After this, `subscribePersistLocal` takes over for write-back.
 */
export function initPersistLocal(store: StoreApi<VisceraStore>): void {
  const persisted = readPersistedState();
  if (!persisted) return;

  const state = store.getState();

  // NOTE (#2523): Node positions are deliberately NOT hydrated here. The diagram
  // YAML `nodes` map is the single source of truth; `nodeOverrides` are transient
  // live-drag state only. Hydrating stale overrides from localStorage would let a
  // fresh instance override (and later corrupt) the curated file.

  // ── UI: Panel Collapsed ─────────────────────────────────────────────────
  if (typeof persisted.ui?.panelCollapsed === 'boolean') {
    state.setPanelCollapsed(persisted.ui.panelCollapsed);
  }

  // ── Editor: Split Ratios ────────────────────────────────────────────────
  if (persisted.editor) {
    if (isValidRatio(persisted.editor.splitRatioAdr)) {
      state.setSplitRatio('adr', persisted.editor.splitRatioAdr);
    }
    if (isValidRatio(persisted.editor.splitRatioYaml)) {
      state.setSplitRatio('yaml', persisted.editor.splitRatioYaml);
    }
  }

  // ── Navigation: Last URL ────────────────────────────────────────────────
  if (persisted.navigation?.lastUrl) {
    Object.entries(persisted.navigation.lastUrl).forEach(([viewKey, url]) => {
      if (typeof url === 'string' && url.length > 0) {
        state.setLastUrl(viewKey, url);
      }
    });
  }
}

function isValidRatio(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.2 && value <= 0.8;
}

function readPersistedState(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Subscribes to persistent slices and writes them to `viscera_state`.
 *
 * Uses `subscribeWithSelector` (already in the store pipeline) to watch
 * UI-preferences slices via a combined selector. A `shallow` equality
 * check prevents redundant writes.
 *
 * Must be called after `initPersistLocal`.
 */
export function subscribePersistLocal(store: StoreApi<VisceraStore>): void {
  if (typeof window === 'undefined') return;

  // subscribeWithSelector adds an overloaded subscribe that accepts a selector + options.
  // StoreApi<T> only exposes the base (listener) signature, so we widen via cast.
  const sub = store.subscribe as <U>(
    selector: (state: VisceraStore) => U,
    listener: (selectedState: U, previousSelectedState: U) => void,
    options?: { equalityFn?: (a: U, b: U) => boolean; fireImmediately?: boolean },
  ) => () => void;

  sub(
    (s: VisceraStore) =>
      [s.panelCollapsed, s.lastUrl, s.splitRatioAdr, s.splitRatioYaml] as const,
    ([panelCollapsed, lastUrl, splitRatioAdr, splitRatioYaml]) => {
      const toWrite: PersistedState = {
        editor: { splitRatioAdr, splitRatioYaml },
        ui: { panelCollapsed },
        navigation: { lastUrl: lastUrl ?? {} },
      };
      writePersistedState(toWrite);
    },
    { equalityFn: shallow },
  );
}

function writePersistedState(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}
