import { produce } from 'immer';

import type { VisceraStore } from './visceraStore';
import type { ImportModule } from '../core/modulesSchema';
import type { StateCreator } from 'zustand';

/** Kontextmenü-Aktion auf einer L4-Datei-Node (via `data`-Callback, Store-frei). */
export type ModuleFilterAction = ModuleFocusMode | 'toggle-collapse' | 'reset';

/** Modus der L4-Interaktion: wie das fokussierte Modul seine Sichtbarkeit bestimmt. */
type ModuleFocusMode = 'focus' | 'reaches' | 'impact';

export interface ModulesSlice {
  modules: ImportModule[];
  system: string | null;
  topLevel: string | null;
  modulesLoading: boolean;
  modulesError: string | null;
  /** Fokussiertes Modul (Node-Name) – nur für L4. */
  focusModuleId: string | null;
  /** Interaktionsmodus des Fokus – `null` wenn kein Fokus aktiv. */
  focusMode: ModuleFocusMode | null;
  /** Kollabierte Module (Node-Namen) – deren transitive Importe werden verborgen. */
  collapsedIds: string[];
  setModulesLoading: () => void;
  setModulesSuccess: (modules: ImportModule[], system: string, topLevel: string | null) => void;
  setModulesError: (message: string) => void;
  resetModules: () => void;
  /** Setzt Fokus + Modus auf ein Modul (pure Filter-Action). */
  setModuleFocus: (moduleName: string, mode: ModuleFocusMode) => void;
  /** Hebt den Fokus auf, ohne die Kollaps-Filter zu berühren. */
  clearModuleFocus: () => void;
  /** Toggelt das Kollaps-Flag eines Moduls. */
  toggleModuleCollapse: (moduleName: string) => void;
  /** Leert alle L4-Filter (Fokus, Modus, Kollaps). */
  resetModuleFilters: () => void;
}

export const createModulesSlice: StateCreator<VisceraStore, [], [], ModulesSlice> = (set) => ({
  modules: [],
  system: null,
  topLevel: null,
  modulesLoading: false,
  modulesError: null,
  focusModuleId: null,
  focusMode: null,
  collapsedIds: [],

  setModulesLoading: () =>
    set(
      produce((state: VisceraStore) => {
        state.modulesLoading = true;
        state.modulesError = null;
      }),
    ),

  setModulesSuccess: (modules, system, topLevel) =>
    set(
      produce((state: VisceraStore) => {
        state.modules = modules;
        state.system = system;
        state.topLevel = topLevel;
        state.modulesLoading = false;
        state.modulesError = null;
      }),
    ),

  setModulesError: (message) =>
    set(
      produce((state: VisceraStore) => {
        state.modulesLoading = false;
        state.modulesError = message;
      }),
    ),

  resetModules: () =>
    set(
      produce((state: VisceraStore) => {
        state.modules = [];
        state.system = null;
        state.topLevel = null;
        state.modulesLoading = false;
        state.modulesError = null;
      }),
    ),

  setModuleFocus: (moduleName, mode) =>
    set(
      produce((state: VisceraStore) => {
        state.focusModuleId = moduleName;
        state.focusMode = mode;
      }),
    ),

  clearModuleFocus: () =>
    set(
      produce((state: VisceraStore) => {
        state.focusModuleId = null;
        state.focusMode = null;
      }),
    ),

  toggleModuleCollapse: (moduleName) =>
    set(
      produce((state: VisceraStore) => {
        if (state.collapsedIds.includes(moduleName)) {
          state.collapsedIds = state.collapsedIds.filter((id) => id !== moduleName);
        } else {
          state.collapsedIds.push(moduleName);
        }
      }),
    ),

  resetModuleFilters: () =>
    set(
      produce((state: VisceraStore) => {
        state.focusModuleId = null;
        state.focusMode = null;
        state.collapsedIds = [];
      }),
    ),
});
