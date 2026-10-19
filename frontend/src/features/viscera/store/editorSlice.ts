import { produce } from 'immer';

import type { VisceraStore } from './visceraStore';
import type { StateCreator } from 'zustand';

const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;

export interface EditorSlice {
  splitRatioAdr: number;
  splitRatioYaml: number;
  setSplitRatio: (scope: 'adr' | 'yaml', value: number) => void;
}

function clamp(value: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, value));
}

export const createEditorSlice: StateCreator<VisceraStore, [], [], EditorSlice> = (set) => ({
  splitRatioAdr: 0.5,
  splitRatioYaml: 0.5,

  setSplitRatio: (scope, value) =>
    set(
      produce((state: VisceraStore) => {
        const clamped = clamp(value);
        if (scope === 'adr') {
          state.splitRatioAdr = clamped;
        } else {
          state.splitRatioYaml = clamped;
        }
      }),
    ),
});
