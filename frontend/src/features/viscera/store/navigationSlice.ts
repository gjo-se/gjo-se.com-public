import { produce } from 'immer';

import type { VisceraStore } from './visceraStore';
import type { Diagram, DiagramSource } from '../core/workspaceSchema';
import type { StateCreator } from 'zustand';

const DEFAULT_SOURCE: DiagramSource = 'code';
const DEFAULT_VIEW_KEY = 'SystemContext';

export interface NavigationSlice {
  /** Diagramm-Welt, die `views` lädt/editiert ('code' | 'golden'). */
  source: DiagramSource;
  viewKey: string;
  detailContainerId: string | null;
  objectId: string | null;
  objectTab: string;
  /** Ephemeres derived-Diagramm (L3/L4) — nur solange eine derived View offen ist (#2491). */
  derivedDiagram: Diagram | null;
  /** Saved URLs per view key, persisted via persistLocal middleware under viscera_state. */
  lastUrl: Record<string, string>;
  setSource: (source: DiagramSource) => void;
  setViewKey: (key: string) => void;
  setDerivedDiagram: (diagram: Diagram) => void;
  clearDerivedDiagram: () => void;
  setDetailContainer: (containerId: string | null) => void;
  setObjectId: (id: string | null) => void;
  setObjectTab: (tab: string) => void;
  /** Stores a URL bookmark for a given view key. Persisted automatically by persistLocal. */
  setLastUrl: (viewKey: string, url: string) => void;
  /** Removes a URL bookmark for a given view key. */
  clearLastUrl: (viewKey: string) => void;
}

export const createNavigationSlice: StateCreator<VisceraStore, [], [], NavigationSlice> = (set) => ({
  source: DEFAULT_SOURCE,
  viewKey: 'SystemContext',
  detailContainerId: null,
  objectId: null,
  objectTab: 'details',
  derivedDiagram: null,
  lastUrl: {},

  setSource: (source) =>
    set(
      produce((state: VisceraStore) => {
        if (state.source === source) return;
        state.source = source;
        // Ein Welt-Wechsel macht die aktive Diagramm-Auswahl der alten Welt
        // ungueltig – analog zur View-Wechsel-Semantik auf die Default-View zurueck.
        state.viewKey = DEFAULT_VIEW_KEY;
        state.derivedDiagram = null;
        state.detailContainerId = null;
        state.objectId = null;
        state.objectTab = 'details';
        state.viewport = { x: 0, y: 0, zoom: 1 };
      }),
    ),

  setViewKey: (key) =>
    set(
      produce((state: VisceraStore) => {
        state.viewKey = key;
        // Ephemerer derived-State ist nur für die offene derived View gültig —
        // bei Navigation wird er verworfen (Resolver greift sonst via Key-Match).
        state.derivedDiagram = null;
        state.detailContainerId = null;
        state.objectId = null;
        state.objectTab = 'details';
        // Reset viewport when switching diagrams — each diagram has its own zoom/pan
        state.viewport = { x: 0, y: 0, zoom: 1 };
      }),
    ),

  setDerivedDiagram: (diagram) =>
    set(
      produce((state: VisceraStore) => {
        state.derivedDiagram = diagram;
      }),
    ),

  clearDerivedDiagram: () =>
    set(
      produce((state: VisceraStore) => {
        state.derivedDiagram = null;
      }),
    ),

  setDetailContainer: (containerId) =>
    set(
      produce((state: VisceraStore) => {
        state.detailContainerId = containerId;
      }),
    ),

  setObjectId: (id) =>
    set(
      produce((state: VisceraStore) => {
        state.objectId = id;
      }),
    ),

  setObjectTab: (tab) =>
    set(
      produce((state: VisceraStore) => {
        state.objectTab = tab;
      }),
    ),

  setLastUrl: (viewKey, url) =>
    set(
      produce((state: VisceraStore) => {
        state.lastUrl[viewKey] = url;
      }),
    ),

  clearLastUrl: (viewKey) =>
    set(
      produce((state: VisceraStore) => {
        delete state.lastUrl[viewKey];
      }),
    ),
});
