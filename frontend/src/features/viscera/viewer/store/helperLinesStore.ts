/**
 * helperLinesStore.ts – Transienter Mini-Store für Drag-Hilfslinien (#2523).
 *
 * BEWUSST als separater zustand-Store außerhalb des großen VisceraStore
 * gehalten: Ein Hilfslinien-Update muss das Overlay re-rendern, darf aber die
 * Canvas-Hierarchie (ReactFlow, useNormalizedCanvasNodes, Nodes) NICHT
 * berühren — sonst springt die gezogene Card beim Move (doppelter Re-Render
 * pro Pointer-Move). Der Card-Move bleibt von den Hilfslinien KOMPLETT
 * unberührt.
 *
 * Kein logger/persist/devtools-Middleware — reiner transienter UI-Zustand.
 */
import { create } from 'zustand';

import type { HelperLines } from '../utils/helperLines';

interface HelperLinesState {
  /** Aktive Hilfslinien (Flow-Koordinaten) bzw. `null` wenn keine. */
  lines: HelperLines | null;
  /** Setzt die aktiven Hilfslinien — re-rendert nur das Overlay. */
  setLines: (lines: HelperLines | null) => void;
}

export const useHelperLinesStore = create<HelperLinesState>((set) => ({
  lines: null,
  setLines: (lines) => set({ lines }),
}));
