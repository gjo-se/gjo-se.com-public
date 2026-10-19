import { badgeKey } from './filterSlice';

import type { BadgeState, EntityType } from './filterSlice';

/**
 * Effective badge states including transient hover focus.
 *
 * When a badge key is hovered (`hoveredKey`) and the corresponding badge
 * is neutral or absent, it is temporarily set to 'focus' for the preview.
 * Otherwise, the original badge states are returned unchanged.
 */
export function withHoveredBadgeFocus(
  badgeStates: Map<string, BadgeState>,
  hoveredKey: string | null,
): Map<string, BadgeState> {
  if (!hoveredKey) return badgeStates;

  const colonIdx = hoveredKey.indexOf(':');
  if (colonIdx === -1) return badgeStates;

  const existing = badgeStates.get(hoveredKey);
  if (existing && existing.state !== 'neutral') return badgeStates;

  const entityType = hoveredKey.slice(0, colonIdx) as EntityType;
  const slug = hoveredKey.slice(colonIdx + 1);

  const updated = new Map(badgeStates);
  updated.set(badgeKey(entityType, slug), { entityType, slug, state: 'focus' });
  return updated;
}
