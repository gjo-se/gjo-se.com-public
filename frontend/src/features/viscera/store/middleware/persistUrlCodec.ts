import type { DiagramSource } from '../../core/workspaceSchema';
import type { ViewportState } from '../canvasSlice';
import type { BadgeState, EntityType } from '../filterSlice';
import type { VisceraStore } from '../visceraStore';
import type { StoreApi } from 'zustand';

// ═══════════════════════════════════════════════════════════════════════════════
// Binding Table: Store Field → URL Parameter
// ═══════════════════════════════════════════════════════════════════════════════
//
// | Store Field               | URL Param   | Type                     | Default            |
// |---------------------------|-------------|--------------------------|--------------------|
// | canvas.viewport.zoom      | zoom        | float (2dp)              | – (not set)        |
// | canvas.viewport.x         | x           | int                      | – (not set)        |
// | canvas.viewport.y         | y           | int                      | – (not set)        |
// | navigation.source         | source      | string ('code'|'golden') | code               |
// | navigation.viewKey        | view        | string                   | SystemContext      |
// | navigation.viewKey (alias)| diagram     | string                   | – (deprecated)     |
// | navigation.objectId       | object      | string                   | –                  |
// | navigation.objectTab      | object_tab  | string                   | details            |
// | navigation.detailContainerId | detail   | string                   | –                  |
// | filter.badgeStates (focus)| focus       | comma-sep "type:slug"    | –                  |
// | filter.badgeStates (hide) | hide        | comma-sep "type:slug"    | –                  |
// | flow.activeFlowId         | flow        | string                   | –                  |
// | (legacy)                  | element     | string                   | – (hydrates to objectId) |
// | (reserved)                | overlay     | "true" / absent          | –                  |

// ── Constants ──────────────────────────────────────────────────────────────────

const PARAM_ZOOM = 'zoom';
const PARAM_X = 'x';
const PARAM_Y = 'y';
const PARAM_SOURCE = 'source';
const PARAM_VIEW = 'view';
const PARAM_DIAGRAM = 'diagram';
const PARAM_DETAIL = 'detail';
const PARAM_OBJECT = 'object';
const PARAM_OBJECT_TAB = 'object_tab';
const PARAM_FLOW = 'flow';
export const PARAM_FOCUS = 'focus';
export const PARAM_HIDE = 'hide';
const PARAM_ELEMENT = 'element';
const PARAM_OVERLAY = 'overlay';

const DEFAULT_VIEW_KEY = 'SystemContext';
const DEFAULT_OBJECT_TAB = 'details';
const DEFAULT_SOURCE: DiagramSource = 'code';

/** Snapshot of URL-mapped fields extracted from the store. */
export interface UrlMappedState {
  viewport: { zoom: number; x: number; y: number };
  source: DiagramSource;
  viewKey: string;
  detailContainerId: string | null;
  objectId: string | null;
  objectTab: string;
  activeFlowId: string | null;
  badgeStates: Map<string, BadgeState>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Apply URL search parameters to the Viscera store.
 *
 * Shared helper used by both `initPersistUrl` (window.location) and
 * `initPersistLocal` (replaying saved URLs from localStorage).
 *
 * Ordering: `setSource` is called first (resets view to the default on a world
 * change), then `setViewKey` (which clears detail/object), then detail/object
 * params are re-applied from the URL.
 */
export function applyUrlSearchParams(store: StoreApi<VisceraStore>, searchString: string): void {
  const params = new URLSearchParams(searchString);
  if (params.size === 0) return;

  const state = store.getState();

  // ── Canvas: Viewport ──────────────────────────────────────────────────────

  const zoomRaw = params.get(PARAM_ZOOM);
  const xRaw = params.get(PARAM_X);
  const yRaw = params.get(PARAM_Y);

  const zoom = zoomRaw ? parseFloat(zoomRaw) : state.viewport.zoom;
  const x = xRaw ? parseFloat(xRaw) : state.viewport.x;
  const y = yRaw ? parseFloat(yRaw) : state.viewport.y;

  if (Number.isFinite(zoom) && Number.isFinite(x) && Number.isFinite(y)) {
    state.setViewport({ x, y, zoom });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  // Source must be applied BEFORE view: setSource resets the viewKey to the
  // default when the world changes, so the view param re-applies afterwards.
  const sourceRaw = params.get(PARAM_SOURCE);
  if (sourceRaw) {
    state.setSource(toDiagramSource(sourceRaw));
  }

  // diagram takes priority over view (matching useViewState.ts semantics)
  const diagramParam = params.get(PARAM_DIAGRAM);
  const viewParam = params.get(PARAM_VIEW);
  const viewKey = diagramParam || viewParam;

  if (viewKey) {
    state.setViewKey(viewKey);
  }

  // Re-apply detail/object AFTER setViewKey (which clears them)
  const detail = params.get(PARAM_DETAIL);
  if (detail) {
    state.setDetailContainer(detail);
  }

  // object param OR legacy element param → objectId
  const object = params.get(PARAM_OBJECT) || params.get(PARAM_ELEMENT);
  const objectTab = params.get(PARAM_OBJECT_TAB);
  if (object) {
    state.setObjectId(object);
  }
  if (objectTab) {
    state.setObjectTab(objectTab);
  }

  // ── Flow ──────────────────────────────────────────────────────────────────

  const flow = params.get(PARAM_FLOW);
  if (flow) {
    state.selectFlow(flow);
  }

  // ── Filter: Focus / Hide Badges ───────────────────────────────────────────
  // Reset first so toggleBadge cycles from neutral (not from whatever
  // stale state may be in the store from a previous page visit).

  const focus = params.get(PARAM_FOCUS);
  const hide = params.get(PARAM_HIDE);

  if (focus || hide) {
    state.resetAll();

    if (focus) {
      parseBadgeParams(focus).forEach(({ type, slug }) => {
        state.toggleBadge(type, slug);
      });
    }

    if (hide) {
      parseBadgeParams(hide).forEach(({ type, slug }) => {
        // Two toggles: neutral→focus→hide
        state.toggleBadge(type, slug);
        state.toggleBadge(type, slug);
      });
    }
  }

  // ── UI: Overlay (reserved for Increment 5) ────────────────────────────────
  // overlay param is parsed but actions are No-Ops in Increment 1.
}

// ── URL → Store (Hydration) ───────────────────────────────────────────────────

/**
 * Serialize badgeStates Map into `focus` and `hide` URL param values.
 */
function buildFilterParams(
  badgeStates: Map<string, BadgeState>,
): { focus: string | null; hide: string | null } {
  const focus: string[] = [];
  const hide: string[] = [];
  badgeStates.forEach((badge, key) => {
    if (badge.state === 'focus') focus.push(key);
    else if (badge.state === 'hide') hide.push(key);
  });
  return {
    focus: focus.length > 0 ? focus.join(',') : null,
    hide: hide.length > 0 ? hide.join(',') : null,
  };
}

// ── Store → URL (Encoding) ────────────────────────────────────────────────────

/**
 * Build a complete URL from the mapped store state.
 *
 * All URL search params are derived from the store snapshot.
 * This function is the SOLE writer for URL persistence — every
 * Store→URL path flows through here.
 */
export function buildUrlFromState(mapped: UrlMappedState): string {
  const next = new URL(window.location.href);

  // ── Viewport ─────────────────────────────────────────────────────────────
  const zoom = +mapped.viewport.zoom.toFixed(2);
  const x = Math.round(mapped.viewport.x);
  const y = Math.round(mapped.viewport.y);

  next.searchParams.set(PARAM_ZOOM, zoom.toString());
  next.searchParams.set(PARAM_X, x.toString());
  next.searchParams.set(PARAM_Y, y.toString());

  // ── Source ────────────────────────────────────────────────────────────────
  // Default `code` is omitted from the URL (backwards compatible).
  if (mapped.source !== DEFAULT_SOURCE) {
    next.searchParams.set(PARAM_SOURCE, mapped.source);
  } else {
    next.searchParams.delete(PARAM_SOURCE);
  }

  // ── View Key ─────────────────────────────────────────────────────────────
  if (mapped.viewKey !== DEFAULT_VIEW_KEY) {
    next.searchParams.set(PARAM_VIEW, mapped.viewKey);
  } else {
    next.searchParams.delete(PARAM_VIEW);
  }
  // diagram alias is only read, never written (deprecated)
  next.searchParams.delete(PARAM_DIAGRAM);

  // ── Detail Container ─────────────────────────────────────────────────────
  if (mapped.detailContainerId) {
    next.searchParams.set(PARAM_DETAIL, mapped.detailContainerId);
  } else {
    next.searchParams.delete(PARAM_DETAIL);
  }

  // ── Object ───────────────────────────────────────────────────────────────
  if (mapped.objectId) {
    next.searchParams.set(PARAM_OBJECT, mapped.objectId);
  } else {
    next.searchParams.delete(PARAM_OBJECT);
    next.searchParams.delete(PARAM_ELEMENT);
  }

  // ── Object Tab ───────────────────────────────────────────────────────────
  if (mapped.objectTab !== DEFAULT_OBJECT_TAB) {
    next.searchParams.set(PARAM_OBJECT_TAB, mapped.objectTab);
  } else {
    next.searchParams.delete(PARAM_OBJECT_TAB);
  }

  // ── Flow ─────────────────────────────────────────────────────────────────
  if (mapped.activeFlowId) {
    next.searchParams.set(PARAM_FLOW, mapped.activeFlowId);
  } else {
    next.searchParams.delete(PARAM_FLOW);
  }

  // ── Filter ───────────────────────────────────────────────────────────────
  const { focus, hide } = buildFilterParams(mapped.badgeStates);
  if (focus) {
    next.searchParams.set(PARAM_FOCUS, focus);
  } else {
    next.searchParams.delete(PARAM_FOCUS);
  }
  if (hide) {
    next.searchParams.set(PARAM_HIDE, hide);
  } else {
    next.searchParams.delete(PARAM_HIDE);
  }

  // ── Legacy / Reserved ────────────────────────────────────────────────────
  // overlay is reserved; preserve if present, don't write
  const overlay = new URLSearchParams(window.location.search).get(PARAM_OVERLAY);
  if (overlay === 'true') {
    next.searchParams.set(PARAM_OVERLAY, 'true');
  } else {
    next.searchParams.delete(PARAM_OVERLAY);
  }

  return next.toString();
}

/**
 * Parse viewport parameters from the current URL search string.
 *
 * Called synchronously BEFORE store creation so the initial viewport is
 * available prior to the first ReactFlow render. Returns a default
 * viewport `{ x: 0, y: 0, zoom: 1 }` when no URL params exist or the
 * values are invalid.
 */
export function hydrateViewportFromUrl(): ViewportState {
  if (typeof window === 'undefined') return { x: 0, y: 0, zoom: 1 };

  try {
    const params = new URLSearchParams(window.location.search);

    const zoom = parseFloat(params.get(PARAM_ZOOM) ?? '') || 1;
    const x = parseInt(params.get(PARAM_X) ?? '', 10) || 0;
    const y = parseInt(params.get(PARAM_Y) ?? '', 10) || 0;

    if (Number.isFinite(zoom) && Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y, zoom };
    }
  } catch {
    // Fall through to default
  }

  return { x: 0, y: 0, zoom: 1 };
}

/**
 * Parse comma-separated type:slug badge parameters.
 *
 * @example "tag:risk-high,status:approved" → [{ type: "tag", slug: "risk-high" }, { type: "status", slug: "approved" }]
 */
export function parseBadgeParams(raw: string): { type: EntityType; slug: string }[] {
  return raw
    .split(',')
    .map((pair) => {
      const colonIndex = pair.indexOf(':');
      if (colonIndex === -1) return { type: 'tag' as EntityType, slug: pair };
      const type = pair.slice(0, colonIndex);
      return {
        type: (type === 'tag' || type === 'status' || type === 'technology' ? type : 'tag') as EntityType,
        slug: pair.slice(colonIndex + 1),
      };
    })
    .filter(({ slug }) => slug.length > 0);
}

/** Normalizes an arbitrary URL/state value into a valid DiagramSource. */
function toDiagramSource(raw: string | null | undefined): DiagramSource {
  return raw === 'golden' ? 'golden' : 'code';
}
