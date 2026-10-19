/**
 * Tests: uiSlice
 *
 * Behaviour: fullscreen/shortcuts/panel toggles and their explicit setters,
 * plus the L4 view-mode projection.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { useVisceraStore } from '@src/features/viscera/store/visceraStore';

import { resetVisceraStore } from '../helpers';

const store = () => useVisceraStore.getState();

beforeEach(() => {
  resetVisceraStore();
});

describe('uiSlice', () => {
  it('starts with all toggles off and the ReactFlow projection', () => {
    expect(store().isFullscreen).toBe(false);
    expect(store().shortcutsOpen).toBe(false);
    expect(store().panelCollapsed).toBe(false);
    expect(store().viewMode).toBe('reactflow');
  });

  it('toggles fullscreen back and forth', () => {
    store().toggleFullscreen();
    expect(store().isFullscreen).toBe(true);

    store().toggleFullscreen();
    expect(store().isFullscreen).toBe(false);
  });

  it('sets fullscreen explicitly', () => {
    store().setFullscreen(true);
    expect(store().isFullscreen).toBe(true);

    store().setFullscreen(false);
    expect(store().isFullscreen).toBe(false);
  });

  it('toggles the shortcuts overlay', () => {
    store().toggleShortcuts();
    expect(store().shortcutsOpen).toBe(true);

    store().toggleShortcuts();
    expect(store().shortcutsOpen).toBe(false);
  });

  it('toggles and sets the panel collapse state', () => {
    store().togglePanelCollapse();
    expect(store().panelCollapsed).toBe(true);

    store().setPanelCollapsed(false);
    expect(store().panelCollapsed).toBe(false);
  });

  it('switches the L4 projection mode', () => {
    store().setViewMode('sigma');
    expect(store().viewMode).toBe('sigma');

    store().setViewMode('reactflow');
    expect(store().viewMode).toBe('reactflow');
  });
});
