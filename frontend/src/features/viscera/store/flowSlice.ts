import { produce } from 'immer';

import type { VisceraStore } from './visceraStore';
import type { StateCreator } from 'zustand';

export interface FlowSlice {
  /** Currently selected flow ID, or null if no flow is active. */
  activeFlowId: string | null;
  /** Zero-based index of the currently active step. */
  activeStepIndex: number;
  /** Whether auto-play is currently running. */
  isPlaying: boolean;
  /** Select a flow (or deselect by passing null). Resets step index and stops playback. */
  selectFlow: (id: string | null) => void;
  /** Set step index and stop playback (for user-triggered navigation). */
  setStep: (index: number) => void;
  /** Set step index without changing playback state (used by auto-play interval). */
  setActiveStepIndex: (index: number) => void;
  /** Set playback state. */
  setPlaying: (playing: boolean) => void;
}

export const createFlowSlice: StateCreator<VisceraStore, [], [], FlowSlice> = (set) => ({
  activeFlowId: null,
  activeStepIndex: 0,
  isPlaying: false,

  selectFlow: (id) =>
    set(
      produce((state: VisceraStore) => {
        state.activeFlowId = id;
        state.activeStepIndex = 0;
        state.isPlaying = false;
      }),
    ),

  setStep: (index) =>
    set(
      produce((state: VisceraStore) => {
        state.activeStepIndex = index;
        state.isPlaying = false;
      }),
    ),

  setActiveStepIndex: (index) =>
    set(
      produce((state: VisceraStore) => {
        state.activeStepIndex = index;
      }),
    ),

  setPlaying: (playing) =>
    set(
      produce((state: VisceraStore) => {
        state.isPlaying = playing;
      }),
    ),
});
