import { useCallback } from 'react';

/** Imperative handle of any node context menu – opens at viewport coordinates. */
export interface ContextMenuHandle {
  open: (x: number, y: number) => void;
}

/**
 * Shared `onContextMenu` handler for node context menus.
 *
 * Suppresses the browser context menu and event bubbling, then opens the
 * referenced imperative menu at the pointer position.
 */
export function useContextMenuOpen<T extends ContextMenuHandle>(
  ref: { current: T | null },
) {
  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      ref.current?.open(e.clientX, e.clientY);
    },
    [ref],
  );
}
