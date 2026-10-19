import type { BadgeState } from './filterSlice';
import type { VisceraStore } from './visceraStore';

// ── Pure Utility Selectors (not bound to store state) ────────────────────────

interface RenderableNodes {
  people?: { id: string }[];
  objects?: { id: string }[];
}

function collectRenderableIds(workspace: RenderableNodes): string[] {
  const ids: string[] = [];
  workspace.objects?.forEach((o) => ids.push(o.id));
  workspace.people?.forEach((p) => ids.push(p.id));
  return ids;
}

/** Determines if all renderable nodes are hidden by active filter badges. */
export function selectIsCanvasEmpty(
  activeWorkspace: RenderableNodes | null | undefined,
  hiddenNodeIds: Set<string>,
  effectiveBadgeStates: Map<string, BadgeState>,
): boolean {
  if (!activeWorkspace || effectiveBadgeStates.size === 0) return false;
  const renderableIds = collectRenderableIds(activeWorkspace);
  if (renderableIds.length === 0) return false;
  return renderableIds.every((id) => hiddenNodeIds.has(id));
}

// ── Canvas ──────────────────────────────────────────────────────────────────

export const selectViewport = (state: VisceraStore) => state.viewport;
export const selectFitViewRequested = (state: VisceraStore) => state.fitViewRequested;
export const selectCanUndo = (state: VisceraStore) => state.canUndo;
export const selectCanRedo = (state: VisceraStore) => state.canRedo;

// ── Filter ──────────────────────────────────────────────────────────────────

export const selectBadgeStates = (state: VisceraStore) => state.badgeStates;
export const selectHoveredKey = (state: VisceraStore) => state.hoveredKey;
export const selectActiveFilterCount = (state: VisceraStore) => state.activeFilterCount;

// ── UI ───────────────────────────────────────────────────────────────────────

export const selectIsFullscreen = (state: VisceraStore) => state.isFullscreen;
export const selectShortcutsOpen = (state: VisceraStore) => state.shortcutsOpen;
export const selectPanelCollapsed = (state: VisceraStore) => state.panelCollapsed;
