import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

import { useVisceraStore } from '../store/visceraStore';

const VIEW_PARAM = 'view';
const DIAGRAM_PARAM = 'diagram';
/** Params that indicate meaningful user state worth persisting. */
const MEANINGFUL_PARAMS = ['zoom', 'x', 'y', 'focus', 'hide'];
/** Params that indicate a fully-specified shared link — don't override these. */
const STATE_PARAMS = ['zoom', 'x', 'y', 'mode', 'object', 'flow', 'overlay'];

/**
 * Persists the last URL per diagram view to the store (which the persistLocal
 * middleware writes to localStorage under `viscera_state`) and restores
 * saved settings when re-visiting a view.
 *
 * Behaviour:
 * - Clean URL (/admin/viscera/views) → restore SystemContext saved state (or show default if never saved)
 * - URL with only view= param → restore that view's saved zoom/filters from store.lastUrl
 * - URL with full params (shared link) → use params as-is, no restore
 *
 * Pattern: URL is the SSOT. The store holds the last complete URL string
 * per view as a "bookmark", automatically persisted by persistLocal.
 */
export function useRestoreLastUrl() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Track last view name so we can detect explicit view switches
  const lastView = useRef(searchParams.get(DIAGRAM_PARAM) || searchParams.get(VIEW_PARAM));

  // ── Persist ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchParams.size === 0) return;
    // Only persist URLs that carry viewport or filter state.
    // Bare ?view=X URLs would overwrite previously saved state.
    if (!MEANINGFUL_PARAMS.some((p) => searchParams.has(p))) return;
    const viewName = searchParams.get(DIAGRAM_PARAM) || searchParams.get(VIEW_PARAM) || 'SystemContext';
    useVisceraStore.getState().setLastUrl(viewName, location.pathname + location.search);
  });

  // ── Restore ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const prevView = lastView.current;
    const currentView = searchParams.get(DIAGRAM_PARAM) || searchParams.get(VIEW_PARAM);
    lastView.current = currentView;

    // Only attempt restore when transitioning TO a clean or bare-view URL
    const isCleanUrl = searchParams.size === 0;
    const isBareViewUrl = searchParams.size > 0
      && currentView
      && !STATE_PARAMS.some((p) => searchParams.has(p));

    if (!isCleanUrl && !isBareViewUrl) return;

    // If view didn't change and we're still on a non-clean URL, skip
    if (prevView === currentView && !isCleanUrl) return;

    const viewName = isCleanUrl
      ? 'SystemContext'
      : (searchParams.get(DIAGRAM_PARAM) || searchParams.get(VIEW_PARAM))!;

    const lastUrl = useVisceraStore.getState().lastUrl;
    const saved = lastUrl[viewName];
    if (saved && saved !== location.pathname + location.search) {
      navigate(saved, { replace: true });
    }
  }, [searchParams, location.pathname, location.search, navigate]);
}
