import type { IconName } from '@src/components/primitives/Icon/Icon.registry';

/**
 * Maps a status name to its corresponding Icon name.
 *
 * Lifecycle statuses: pending, approved, deprecated, rejected
 * Triage statuses:   new, seen, favorite, archived, applied
 */
export const STATUS_ICON_MAP: Record<string, IconName> = {
  pending: 'clock',
  active: 'check-circle',
  deprecated: 'alert-triangle',
  rejected: 'x-circle',
  new: 'plus-circle',
  seen: 'eye',
  favorite: 'star',
  archived: 'archive',
  applied: 'send',
  blocked: 'ban',
  inactive: 'x-circle',
} as const;

/**
 * Returns the Icon name for a given status.
 * Falls back to `circle` when the status is unknown.
 *
 * @param name The status name (e.g. "pending", "approved").
 * @returns The matching Icon name.
 */
export function getStatusIcon(name: string): IconName {
  return STATUS_ICON_MAP[name] ?? 'circle';
}
