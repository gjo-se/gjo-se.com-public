import type { Workspace } from '../../core/workspaceSchema';
import type { BadgeState } from '../hooks/usePerspectiveState';

// ── Types ────────────────────────────────────────────────────────────────────

/** Output of computeFilteredNodeIds: two disjoint sets of node IDs. */
export interface FilteredNodeIds {
  /** Focus: IDs of non-matching cards to be dimmed (lower opacity). */
  dimmedNodeIds: Set<string>;
  /** Hide: IDs of matching cards to be completely hidden. */
  hiddenNodeIds: Set<string>;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Flattened representation of a renderable workspace object with slug-based fields. */
interface FlatObject {
  id: string;
  tags: string[];
  status: string | undefined;
  technologies: string[];
}

/**
 * Type-aware badge-to-object matching.
 *
 * - tag badge → checks obj.tags[]
 * - status badge → checks obj.status
 * - technology badge → checks obj.technologies[]
 */
function badgeMatchesObject(badge: BadgeState, obj: FlatObject): boolean {
  switch (badge.entityType) {
    case 'tag':
      return obj.tags.includes(badge.slug);
    case 'status':
      return obj.status === badge.slug;
    case 'technology':
      return obj.technologies.includes(badge.slug);
  }
}

/**
 * Collect all renderable objects from the workspace.
 *
 * Objects are delivered flat by the API (workspace.objects, all top-level),
 * so no nested containers/components traversal is needed.
 * People live in a separate top-level list.
 */
function collectAllObjects(workspace: Workspace): FlatObject[] {
  const objects: FlatObject[] = [];

  workspace.objects?.forEach((obj) => objects.push(toFlat(obj)));

  workspace.people?.forEach((person) => objects.push(toFlat(person)));

  return objects;
}

/**
 * Compute which node IDs should be dimmed or hidden based on active badge states.
 *
 * **Pure function** – no side effects, deterministic output for given inputs.
 *
 * ## Matching rules
 *
 * | Badge type  | Matches field         | Operator       |
 * |-------------|-----------------------|----------------|
 * | tag         | obj.tags[]            | includes(slug) |
 * | status      | obj.status            | === slug       |
 * | technology  | obj.technologies[]    | includes(slug) |
 *
 * ## Logic
 *
 * 1. **Hide (OR):** An object is hidden if ANY hide badge matches.
 * 2. **Focus (AND):** An object is a focus-match only if ALL focus badges match.
 *    Objects that are NOT focus-matches (and not already hidden) are added to `dimmedNodeIds`.
 * 3. **Precedence:** Hide wins over focus – hidden objects are never dimmed.
 *
 * @param workspace - The full workspace model with flat objects and people.
 * @param badgeStates - Active badge states keyed by `entityType:slug` (from usePerspectiveState).
 * @returns Two disjoint sets of node IDs.
 */
export function computeFilteredNodeIds(
  workspace: Workspace,
  badgeStates: Map<string, BadgeState>,
): FilteredNodeIds {
  const hiddenNodeIds = new Set<string>();
  const dimmedNodeIds = new Set<string>();

  // Partition badges by state (ignore neutral)
  const focusBadges: BadgeState[] = [];
  const hideBadges: BadgeState[] = [];
  badgeStates.forEach((badge) => {
    if (badge.state === 'focus') focusBadges.push(badge);
    else if (badge.state === 'hide') hideBadges.push(badge);
  });

  // No active badges → both sets empty (early return)
  if (focusBadges.length === 0 && hideBadges.length === 0) {
    return { dimmedNodeIds, hiddenNodeIds };
  }

  const allObjects = collectAllObjects(workspace);

  // Hide (OR): any single hide badge match hides the object
  if (hideBadges.length > 0) {
    allObjects.forEach((obj) => {
      if (hideBadges.some((badge) => badgeMatchesObject(badge, obj))) {
        hiddenNodeIds.add(obj.id);
      }
    });
  }

  // Focus (AND): object must match ALL focus badges, otherwise dimmed
  if (focusBadges.length > 0) {
    allObjects.forEach((obj) => {
      // Already hidden → do not additionally dim
      if (hiddenNodeIds.has(obj.id)) return;

      const isFocusMatch = focusBadges.every((badge) =>
        badgeMatchesObject(badge, obj),
      );
      if (!isFocusMatch) {
        dimmedNodeIds.add(obj.id);
      }
    });
  }

  return { dimmedNodeIds, hiddenNodeIds };
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Extract the filterable fields from any node-like workspace object. */
function toFlat(source: {
  id: string;
  tags?: string[];
  status?: string;
  technologies?: string[];
}): FlatObject {
  return {
    id: source.id,
    tags: source.tags ?? [],
    status: source.status,
    technologies: source.technologies ?? [],
  };
}
