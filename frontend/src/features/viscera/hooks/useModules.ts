import { useCallback } from 'react';

import { fetchModules } from '../services/modulesService';
import { useVisceraStore } from '../store/visceraStore';


import type { ImportModule } from '../core/modulesSchema';

export interface UseModulesResult {
  /** L4-Module der aktuellen Sicht (leer bis zum ersten Laden). */
  modules: ImportModule[];
  /** Das geladene System. */
  system: string | null;
  /** Optionaler Top-Level-Filter der aktuellen Sicht. */
  topLevel: string | null;
  modulesLoading: boolean;
  modulesError: string | null;
  /** Lädt `modules[]` für das System (optional auf einen Top-Level begrenzt). */
  loadModules: (targetSystem: string, targetTopLevel?: string) => Promise<void>;
  /** Leert den Slice wieder. */
  resetModules: () => void;
}

/**
 * Hook für die L4-Datenbeschaffung.
 *
 * Orchestriert Laden (Service) und Schreiben/Lesen (Store-Slice) als SSOT –
 * gemäß fe-architecture §3.3. Kein fetch im Slice; der Fetch läuft im Service.
 */
export function useModules(): UseModulesResult {
  const modules = useVisceraStore((s) => s.modules);
  const system = useVisceraStore((s) => s.system);
  const topLevel = useVisceraStore((s) => s.topLevel);
  const modulesLoading = useVisceraStore((s) => s.modulesLoading);
  const modulesError = useVisceraStore((s) => s.modulesError);
  const loadModules = useCallback(async (targetSystem: string, targetTopLevel?: string) => {
    useVisceraStore.getState().setModulesLoading();
    try {
      const data = await fetchModules(targetSystem, targetTopLevel);
      useVisceraStore.getState().setModulesSuccess(data, targetSystem, targetTopLevel ?? null);
    } catch (err) {
      useVisceraStore.getState().setModulesError(err instanceof Error ? err.message : String(err));
    }
  }, []);
  return {
    modules,
    system,
    topLevel,
    modulesLoading,
    modulesError,
    loadModules,
    resetModules: useVisceraStore.getState().resetModules,
  };
}
