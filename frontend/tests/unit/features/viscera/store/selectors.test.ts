/**
 * Tests: selectors
 *
 * Behaviour: the pure empty-canvas derivation (null/empty/all-hidden cases)
 * and the store field selectors.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  selectActiveFilterCount,
  selectBadgeStates,
  selectCanRedo,
  selectCanUndo,
  selectFitViewRequested,
  selectHoveredKey,
  selectIsCanvasEmpty,
  selectIsFullscreen,
  selectPanelCollapsed,
  selectShortcutsOpen,
  selectViewport,
} from '@src/features/viscera/store/selectors';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { makeObject, makeWorkspace, resetVisceraStore } from '../helpers';

import type { BadgeState } from '@src/features/viscera/store/filterSlice';

const badgeMap: Map<string, BadgeState> = new Map([
  ['tag:x', { entityType: 'tag', slug: 'x', state: 'hide' }],
]);

describe('selectIsCanvasEmpty', () => {
  it('returns false without a workspace', () => {
    expect(selectIsCanvasEmpty(null, new Set(['a']), badgeMap)).toBe(false);
    expect(selectIsCanvasEmpty(undefined, new Set(['a']), badgeMap)).toBe(false);
  });

  it('returns false when no badge filter is active', () => {
    const workspace = makeWorkspace({ objects: [makeObject({ id: 'a' })] });

    expect(selectIsCanvasEmpty(workspace, new Set(['a']), new Map())).toBe(false);
  });

  it('returns false when the workspace has no renderable nodes', () => {
    expect(selectIsCanvasEmpty(makeWorkspace(), new Set(), badgeMap)).toBe(false);
  });

  it('returns true when every object and person is hidden', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'a' })],
      people: [makeObject({ id: 'p', type: 'person' })],
    });

    expect(selectIsCanvasEmpty(workspace, new Set(['a', 'p']), badgeMap)).toBe(true);
  });

  it('returns false when a single renderable node remains visible', () => {
    const workspace = makeWorkspace({
      objects: [makeObject({ id: 'a' }), makeObject({ id: 'b' })],
    });

    expect(selectIsCanvasEmpty(workspace, new Set(['a']), badgeMap)).toBe(false);
  });
});

describe('store field selectors', () => {
  beforeEach(() => {
    resetVisceraStore();
  });

  it('read the canvas fields', () => {
    const state = useVisceraStore.getState();
    useVisceraStore.setState({
      viewport: { x: 1, y: 2, zoom: 3 },
      fitViewRequested: true,
      canUndo: true,
      canRedo: false,
    });

    const next = useVisceraStore.getState();

    expect(selectViewport(next)).toEqual({ x: 1, y: 2, zoom: 3 });
    expect(selectFitViewRequested(next)).toBe(true);
    expect(selectCanUndo(next)).toBe(true);
    expect(selectCanRedo(next)).toBe(false);
    expect(selectViewport(state)).toBeDefined();
  });

  it('read the filter fields', () => {
    useVisceraStore.setState({
      badgeStates: badgeMap,
      hoveredKey: 'tag:x',
      activeFilterCount: 1,
    });

    const state = useVisceraStore.getState();

    expect(selectBadgeStates(state)).toBe(badgeMap);
    expect(selectHoveredKey(state)).toBe('tag:x');
    expect(selectActiveFilterCount(state)).toBe(1);
  });

  it('read the UI fields', () => {
    useVisceraStore.setState({ isFullscreen: true, shortcutsOpen: true, panelCollapsed: true });

    const state = useVisceraStore.getState();

    expect(selectIsFullscreen(state)).toBe(true);
    expect(selectShortcutsOpen(state)).toBe(true);
    expect(selectPanelCollapsed(state)).toBe(true);
  });
});
