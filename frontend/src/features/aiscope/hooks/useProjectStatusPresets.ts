/**
 * useProjectStatusPresets – Preset + per-row status logic for the projects list.
 *
 * Holds the active list preset (default "open") as a registry-defined URL param
 * owned by useTableUrlState (shared tableKey) and derives the backend filter
 * parameters (status/include_archived). Kept separate so useAdminProjects.ts
 * stays under the split threshold.
 */

import { useCallback, useMemo } from 'react';

import { useTableUrlState } from '@src/components/table/useTableUrlState';
import type { TableParamRegistry } from '@src/components/table/useTableUrlState';

import { DEFAULT_PROJECT_PRESET, PROJECT_PRESET_FILTERS } from '../core/types';

import type { PresetFilter, ProjectPreset } from '../core/types';

export interface UseProjectStatusPresetsParams {
  /** Shared table key so the preset param syncs with the other list filters. */
  tableKey: string
}

export interface UseProjectStatusPresetsResult {
  preset: ProjectPreset
  filter: PresetFilter
  setPreset: (preset: ProjectPreset) => void
  resetPreset: () => void
}

const PRESET_PARAM = 'preset';

const VALID_PRESETS = new Set<string>(Object.keys(PROJECT_PRESET_FILTERS));

/** Module-level registry (stable reference) for the preset URL param. */
const PRESET_REGISTRY: TableParamRegistry = {
  [PRESET_PARAM]: {
    default: DEFAULT_PROJECT_PRESET,
    parse: (raw: string): ProjectPreset =>
      VALID_PRESETS.has(raw) ? (raw as ProjectPreset) : DEFAULT_PROJECT_PRESET,
    serialize: (value: unknown): string => String(value),
  },
};

/** Manages list presets (URL-synced via the owner). */
export function useProjectStatusPresets(
  { tableKey }: UseProjectStatusPresetsParams,
): UseProjectStatusPresetsResult {
  const { params, setParam } = useTableUrlState(tableKey, PRESET_REGISTRY);
  const preset = (params[PRESET_PARAM] as ProjectPreset | undefined) ?? DEFAULT_PROJECT_PRESET;

  const filter = useMemo<PresetFilter>(() => PROJECT_PRESET_FILTERS[preset], [preset]);

  const setPreset = useCallback((next: ProjectPreset) => {
    setParam(PRESET_PARAM, next);
  }, [setParam]);

  const resetPreset = useCallback(() => {
    setParam(PRESET_PARAM, DEFAULT_PROJECT_PRESET);
  }, [setParam]);

  return { preset, filter, setPreset, resetPreset };
}
