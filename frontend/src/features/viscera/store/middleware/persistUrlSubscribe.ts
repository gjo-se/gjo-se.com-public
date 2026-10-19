import { shallow } from 'zustand/shallow';

import { buildUrlFromState } from './persistUrlCodec';

import type { VisceraStore } from '../visceraStore';
import type { UrlMappedState } from './persistUrlCodec';
import type { StoreApi } from 'zustand';

const VIEWPORT_DEBOUNCE_MS = 200;

function selectUrlMappedFields(state: VisceraStore): UrlMappedState {
  return {
    viewport: {
      zoom: state.viewport.zoom,
      x: state.viewport.x,
      y: state.viewport.y,
    },
    source: state.source,
    viewKey: state.viewKey,
    detailContainerId: state.detailContainerId,
    objectId: state.objectId,
    objectTab: state.objectTab,
    activeFlowId: state.activeFlowId,
    badgeStates: state.badgeStates,
  };
}

/**
 * Bidirectional URL Persistence Middleware (Store → URL).
 *
 * Subscribes to ALL URL-mapped store fields and writes them to the browser
 * URL via `history.replaceState`. This is the SINGLE write path for URL
 * persistence — no other code may call `history.replaceState` or
 * `setSearchParams` for this purpose.
 *
 * Debouncing:
 * - Viewport (zoom/x/y): 200ms debounce (ReactFlow pan/zoom at 60fps)
 * - Navigation, flow, filter: immediate write
 *
 * Loop prevention: before writing, compares the target URL against the
 * last-written URL. If identical, the write is skipped.
 */
export function subscribePersistUrl(store: StoreApi<VisceraStore>): void {
  if (typeof window === 'undefined') return;

  let lastWrittenUrl: string | null = null;
  let viewportDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingMappedState: UrlMappedState | null = null;

  // subscribeWithSelector adds an overloaded subscribe that accepts a selector + options.
  const sub = store.subscribe as <U>(
    selector: (state: VisceraStore) => U,
    listener: (selectedState: U, previousSelectedState: U) => void,
    options?: { equalityFn?: (a: U, b: U) => boolean; fireImmediately?: boolean },
  ) => () => void;

  sub(
    selectUrlMappedFields,
    (mapped, prevMapped) => {
      // ── Detect which fields changed ─────────────────────────────────────
      const viewportChanged =
        mapped.viewport.zoom !== prevMapped.viewport.zoom ||
        mapped.viewport.x !== prevMapped.viewport.x ||
        mapped.viewport.y !== prevMapped.viewport.y;

      const otherChanged =
        mapped.source !== prevMapped.source ||
        mapped.viewKey !== prevMapped.viewKey ||
        mapped.detailContainerId !== prevMapped.detailContainerId ||
        mapped.objectId !== prevMapped.objectId ||
        mapped.objectTab !== prevMapped.objectTab ||
        mapped.activeFlowId !== prevMapped.activeFlowId ||
        mapped.badgeStates !== prevMapped.badgeStates;

      if (!viewportChanged && !otherChanged) return;

      // ── Write or debounce ──────────────────────────────────────────────
      const doWrite = () => {
        const state = mapped;
        const urlString = buildUrlFromState(state);

        if (urlString === lastWrittenUrl) return;
        if (urlString === window.location.href) {
          lastWrittenUrl = urlString;
          return;
        }

        lastWrittenUrl = urlString;
        window.history.replaceState(null, '', urlString);
      };

      if (viewportChanged && !otherChanged) {
        // Pure viewport change: debounce
        pendingMappedState = mapped;
        if (viewportDebounceTimer !== null) {
          clearTimeout(viewportDebounceTimer);
        }
        viewportDebounceTimer = setTimeout(() => {
          viewportDebounceTimer = null;
          if (pendingMappedState) {
            const urlString = buildUrlFromState(pendingMappedState);

            if (urlString === lastWrittenUrl) return;
            if (urlString === window.location.href) {
              lastWrittenUrl = urlString;
              return;
            }

            lastWrittenUrl = urlString;
            window.history.replaceState(null, '', urlString);
          }
        }, VIEWPORT_DEBOUNCE_MS);
      } else {
        // Non-viewport change (or combined): immediate write
        if (viewportDebounceTimer !== null) {
          clearTimeout(viewportDebounceTimer);
          viewportDebounceTimer = null;
        }
        doWrite();
      }
    },
    { equalityFn: shallow },
  );
}
