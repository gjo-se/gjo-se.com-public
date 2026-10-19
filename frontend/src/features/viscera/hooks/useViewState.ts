import { useCallback } from 'react';

import { useVisceraStore } from '../store/visceraStore';

const DEFAULT_VIEW = 'SystemContext';

export interface UseViewStateResult {
  /** Current view key (e.g. "SystemContext" or system ID). */
  currentViewKey: string;
  /** Navigate to a different view. */
  setViewKey: (key: string) => void;
  /** Current detail container ID (e.g. "backend.llmPipeline") or null. */
  detailContainerId: string | null;
  /** Open detail view for a container. Pass null to close. */
  setDetailContainer: (containerId: string | null) => void;
  /** Current selected object ID (e.g. "backend" or "backend.llmPipeline") or null. */
  objectId: string | null;
  /** Set the selected object ID (opens the ObjectDetailsPanel). Pass null to close. */
  setObjectId: (id: string | null) => void;
  /** Current active object tab (e.g. "details", "edges", "history"). */
  objectTab: string;
  /** Set the active object tab. */
  setObjectTab: (tab: string) => void;
}

/**
 * View state for the Viscera.
 *
 * @see G11 – Golden Reference: viewer nutzt diesen Wrapper selbst,
 *   daher stabiler Wrapper (keine Löschung). Der Hook delegiert vollständig
 *   an `useVisceraStore` (SSOT) und stellt Setter-Callbacks bereit.
 *   Prefer direct store access for new code outside viewer/.
 *
 * - Level 1 (SystemContext) → default
 * - Level 2 (Container) → clicked system ID (`?view=<key>` or `?diagram=<key>`)
 * - Level 3 (Detail Diagram) → clicked container ID (`?detail=<id>`)
 * - ObjectDetailsPanel → `?object=<id>&object_tab=details`
 *
 * `?diagram=` is an alias for `?view=` (takes priority when both are set).
 * `setViewKey()` writes to `?view=` only.
 * State is synced to URL search params via the persistUrl middleware.
 */
export function useViewState(): UseViewStateResult {
  // Read from store (SSOT), not from useSearchParams
  const viewKey = useVisceraStore((s) => s.viewKey);
  const detailContainerId = useVisceraStore((s) => s.detailContainerId);
  const objectId = useVisceraStore((s) => s.objectId);
  const objectTab = useVisceraStore((s) => s.objectTab);

  const currentViewKey = viewKey || DEFAULT_VIEW;

  const setViewKey = useCallback((key: string) => {
    useVisceraStore.getState().setViewKey(key);
  }, []);

  const setDetailContainer = useCallback((containerId: string | null) => {
    useVisceraStore.getState().setDetailContainer(containerId);
  }, []);

  const setObjectId = useCallback((id: string | null) => {
    const store = useVisceraStore.getState();
    if (id === null) {
      store.setObjectId(null);
    } else {
      store.setObjectId(id);
    }
  }, []);

  const setObjectTab = useCallback((tab: string) => {
    useVisceraStore.getState().setObjectTab(tab);
  }, []);

  return {
    currentViewKey,
    setViewKey,
    detailContainerId,
    setDetailContainer,
    objectId,
    setObjectId,
    objectTab,
    setObjectTab,
  };
}
