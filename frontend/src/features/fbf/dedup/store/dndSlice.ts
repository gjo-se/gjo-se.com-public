/**
 * dndSlice.ts – Drag-and-drop state.
 */

import type { DedupState } from './types';
import type { StateCreator } from 'zustand';

export interface DndSlice {
  dragActive: boolean
}

export const createDndSlice: StateCreator<DedupState, [], [], DndSlice> = () => ({
  dragActive: false,
});
