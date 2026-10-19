import { useMemo } from 'react';

import { useShortcuts } from '../../core/useShortcuts';
import { getVisceraCommandHistory, useVisceraStore } from '../../store/visceraStore';

import type { Shortcut } from '../../core/useShortcuts';
import type { VisceraStore } from '../../store/visceraStore';

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Syncs CommandHistory operation result back to the Zustand store.
 * Persistence is handled automatically by the persistLocal middleware.
 */
function applyCommandHistoryResult(newState: VisceraStore) {
  const ch = getVisceraCommandHistory();

  useVisceraStore.setState({
    nodeOverrides: newState.nodeOverrides,
    overrides: newState.overrides,
    canUndo: ch.canUndo,
    canRedo: ch.canRedo,
  });
}

/**
 * Keyboard shortcut definitions for the Viscera Views page.
 * Handlers bind directly to store actions instead of dispatching CustomEvents.
 */
export const KEYBOARD_SHORTCUTS: Shortcut[] = [
  {
    key: '1',
    description: 'Level 1: Fit view',
    group: 'diagram',
    handler: () => useVisceraStore.getState().fitView(),
  },
  {
    key: '2',
    description: 'Level 2: Zoom in',
    group: 'diagram',
    handler: () => useVisceraStore.getState().zoomIn(),
  },
  {
    key: '3',
    description: 'Level 3: Zoom reset',
    group: 'diagram',
    handler: () => useVisceraStore.getState().zoomReset(),
  },
  {
    key: '+',
    description: 'Zoom in',
    group: 'diagram',
    handler: () => useVisceraStore.getState().zoomIn(),
  },
  {
    key: '-',
    description: 'Zoom out',
    group: 'diagram',
    handler: () => useVisceraStore.getState().zoomOut(),
  },
  {
    key: '0',
    description: 'Zoom to fit',
    group: 'diagram',
    handler: () => useVisceraStore.getState().fitView(),
  },
  {
    key: 'E',
    description: 'Editor öffnen',
    group: 'tools',
    handler: () => {
      const editorUrl =
        `${window.location.pathname.replace('/views', '/editor')}${window.location.search}`;
      window.location.href = editorUrl;
    },
  },
  {
    key: 'F',
    description: 'Vollbild umschalten',
    group: 'diagram',
    handler: () => {
      // Fullscreen is managed locally in VisceraViewsPage.
      // Trigger via a callback that the Page provides.
      // This will be overridden at runtime in the hook.
    },
  },
  {
    key: 'Cmd+Z',
    description: 'Undo',
    group: 'diagram',
    handler: () => {
      const ch = getVisceraCommandHistory();
      ch.syncState(useVisceraStore.getState());
      const newState = ch.undo();
      applyCommandHistoryResult(newState);
    },
  },
  {
    key: 'Cmd+Shift+Z',
    description: 'Redo',
    group: 'diagram',
    handler: () => {
      const ch = getVisceraCommandHistory();
      ch.syncState(useVisceraStore.getState());
      const newState = ch.redo();
      applyCommandHistoryResult(newState);
    },
  },
  {
    key: '?',
    description: 'Tastaturkürzel anzeigen',
    group: 'navigation',
    handler: () => useVisceraStore.getState().toggleShortcuts(),
  },
  {
    key: 'Delete',
    description: 'Selektierte(s) Objekt(e) löschen',
    group: 'diagram',
    handler: () => {
      // Overridden at runtime via useKeyboardShortcuts parameter
    },
  },
  {
    key: 'Backspace',
    description: 'Selektierte(s) Objekt(e) löschen',
    group: 'diagram',
    handler: () => {
      // Overridden at runtime via useKeyboardShortcuts parameter
    },
  },
];

/**
 * Registers keyboard shortcuts bound directly to VisceraStore actions.
 * Replaces the old window.dispatchEvent pattern with typed, traceable store access.
 *
 * @param toggleFullscreen - Callback for the fullscreen toggle (managed locally in the Page).
 * @param deleteSelectedElements - Callback for deleting selected nodes and edges via keyboard shortcut.
 */
export function useKeyboardShortcuts(
  toggleFullscreen: () => void,
  deleteSelectedElements: () => void,
): void {
  const shortcuts = useMemo(
    (): Shortcut[] =>
      KEYBOARD_SHORTCUTS.map((s) => {
        if (s.key === 'F') {
          return { ...s, handler: toggleFullscreen };
        }
        if (s.key === 'Delete' || s.key === 'Backspace') {
          return { ...s, handler: deleteSelectedElements };
        }
        return s;
      }),
    [toggleFullscreen, deleteSelectedElements],
  );

  useShortcuts(shortcuts);
}
