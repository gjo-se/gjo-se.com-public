/**
 * AIScope – gemeinsame Typen für das Feature.
 *
 * Data-Fetching, Scraper-Steuerung und UI-Komponenten teilen sich diese Typen.
 */

import type { ChipVariants } from '@src/components/primitives/Chip';
import type { ProjectStatus } from '@src/lib/api/aiscopeTypes';

export type { ProjectStatus } from '@src/lib/api/aiscopeTypes';

// ── Field types (Detail-Ansicht) ───────────────────────────────────

export interface BadgesField {
  kind: 'badges'
  label: string
  values: string[]
}

export type FieldEntry = TextField | BadgesField;

export interface FreelancermapFilterState {
  q: string
  jobRole: string
  page: number
  size: number
  sort: string
  order: string
}

export interface FreelancermapScraperState {
  status: ScraperStatus
  maxResults: string
  savedCount: number | null
}

/** Backend filter parameters derived from a preset. */
export interface PresetFilter {
  status?: ProjectStatus
  include_archived: boolean
}

/** Selectable list preset for the projects toolbar. */
export type ProjectPreset = 'open' | 'new' | 'favorites' | 'applied' | 'archived' | 'all';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  new: 'Neu',
  favorite: 'Favorit',
  applied: 'Beworben',
  archived: 'Archiviert',
};

export type ReReadStatus = 'idle' | 'running' | 'done' | 'error';

export type ScraperStatus = 'idle' | 'running' | 'done' | 'error';

/** Default preset – shows all non-deprecated ("open") projects. */
export const DEFAULT_PROJECT_PRESET: ProjectPreset = 'open';

/** Maps each preset to its backend filter parameters. */
export const PROJECT_PRESET_FILTERS: Record<ProjectPreset, PresetFilter> = {
  open: { include_archived: false },
  new: { status: 'new', include_archived: true },
  favorites: { status: 'favorite', include_archived: true },
  applied: { status: 'applied', include_archived: true },
  archived: { status: 'archived', include_archived: true },
  all: { include_archived: true },
};

/** Ordered, user-visible presets for the toolbar. */
export const PROJECT_PRESETS: { value: ProjectPreset; label: string }[] = [
  { value: 'open', label: 'Offen' },
  { value: 'new', label: 'Neu' },
  { value: 'favorites', label: 'Favoriten' },
  { value: 'applied', label: 'Beworben' },
  { value: 'archived', label: 'Archiviert' },
  { value: 'all', label: 'Alle' },
];

export interface TextField {
  kind: 'text'
  label: string
  value: string | null | undefined
  warn?: boolean
  /** Override the default Chip variant for this field (e.g. 'success' for mapped). */
  chipVariant?: ChipVariants['variant']
}

export type { DatePreset, StoredDateFilter } from '@src/lib/formatDate';
