import type { CSSProperties } from 'react';

/** Max height of a viscera node context-menu panel (triggers scroll beyond). */
export const CONTEXT_MENU_MAX_HEIGHT = 320;

/** Clamps a menu's left edge to the viewport (keeps it fully visible). */
export function clampX(clientX: number, menuWidth: number): number {
  const viewportWidth = window.innerWidth;
  const rightEdge = clientX + menuWidth + 8;
  if (rightEdge > viewportWidth) {
    return Math.max(4, viewportWidth - menuWidth - 8);
  }
  return Math.max(4, clientX);
}

/** Clamps a menu's top edge to the viewport (keeps it fully visible). */
export function clampY(clientY: number, menuHeight: number): number {
  const viewportHeight = window.innerHeight;
  const bottomEdge = clientY + menuHeight + 8;
  if (bottomEdge > viewportHeight) {
    return Math.max(4, viewportHeight - menuHeight - 8);
  }
  return Math.max(4, clientY);
}

/**
 * Position style for a viscera node context-menu panel anchored at a viewport
 * point. `menuWidth` is the panel's assumed width (used for edge clamping).
 */
export function contextMenuPanelStyle(x: number, y: number, menuWidth: number): CSSProperties {
  return {
    position: 'absolute',
    left: clampX(x, menuWidth),
    top: clampY(y, CONTEXT_MENU_MAX_HEIGHT),
    minWidth: 260,
    maxWidth: 380,
    maxHeight: CONTEXT_MENU_MAX_HEIGHT,
    overflowY: 'auto',
  };
}
