import { produce } from 'immer';

import type { VisceraStore } from './visceraStore';
import type { StateCreator } from 'zustand';

export interface UISlice {
  isFullscreen: boolean;
  /** Keyboard shortcuts overlay visibility (replaces local useState in Page). */
  shortcutsOpen: boolean;
  /** PerspectiveBar panel collapse state (migrated from local useState + localStorage). */
  panelCollapsed: boolean;
  /** L4-Sicht-Projektion – Session-State, Standard Sicht A (ReactFlow). */
  viewMode: ViewMode;
  toggleFullscreen: () => void;
  setFullscreen: (value: boolean) => void;
  /** Toggles the keyboard shortcuts overlay (bound to '?' key). */
  toggleShortcuts: () => void;
  /** Toggles the PerspectiveBar panel collapse. */
  togglePanelCollapse: () => void;
  setPanelCollapsed: (value: boolean) => void;
  /** Setzt die aktive L4-Sicht-Projektion ('reactflow' | 'sigma'). */
  setViewMode: (viewMode: ViewMode) => void;
}

/** Aktive Projektion der L4-Sicht: ReactFlow-Canvas oder Sigma-WebGL-Gesamtnetz. */
type ViewMode = 'reactflow' | 'sigma';

export const createUISlice: StateCreator<VisceraStore, [], [], UISlice> = (set) => ({
  isFullscreen: false,
  shortcutsOpen: false,
  panelCollapsed: false,
  viewMode: 'reactflow',

  toggleFullscreen: () =>
    set(
      produce((state: VisceraStore) => {
        state.isFullscreen = !state.isFullscreen;
      }),
    ),

  setFullscreen: (value: boolean) =>
    set(
      produce((state: VisceraStore) => {
        state.isFullscreen = value;
      }),
    ),

  toggleShortcuts: () =>
    set(
      produce((state: VisceraStore) => {
        state.shortcutsOpen = !state.shortcutsOpen;
      }),
    ),

  togglePanelCollapse: () =>
    set(
      produce((state: VisceraStore) => {
        state.panelCollapsed = !state.panelCollapsed;
      }),
    ),

  setPanelCollapsed: (value: boolean) =>
    set(
      produce((state: VisceraStore) => {
        state.panelCollapsed = value;
      }),
    ),

  setViewMode: (viewMode: ViewMode) =>
    set(
      produce((state: VisceraStore) => {
        state.viewMode = viewMode;
      }),
    ),
});
