import { useMemo } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Icon from '@src/components/primitives/Icon/Icon';
import Text from '@src/components/primitives/Text/Text';
import { useEntityCache } from '@src/features/viscera/core/useEntityCache';
import type { EntityData } from '@src/features/viscera/core/useEntityCache';
import type { Workspace } from '@src/features/viscera/core/workspaceSchema';
import { badgeKey } from '@src/features/viscera/store/filterSlice';
import type { BadgeState, EntityType } from '@src/features/viscera/store/filterSlice';
import {
  selectBadgeStates,
  selectHoveredKey,
  selectActiveFilterCount,
  selectPanelCollapsed,
} from '@src/features/viscera/store/selectors';
import { useVisceraStore } from '@src/features/viscera/store/visceraStore';
import { COLOR_TOKEN_CSS } from '@src/lib/colorTokens';
import type { ColorToken } from '@src/lib/colorTokens';
import { cn } from '@src/lib/utils';


interface BadgeRowItem {
  slug: string;
  entityType: EntityType;
  entityData: EntityData | undefined;
}

// ── Internal types ───────────────────────────────────────────────────────────

/** Props for the PerspectiveBar floating filter bar component. */
export interface PerspectiveBarProps {
  /** The full workspace model (needed to extract unique tag/status/tech slugs). */
  workspace: Workspace;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collect all unique slugs per entity type from the workspace.
 * Reads the flat workspace.objects list (all top-level) plus people.
 */
function collectSlugs(workspace: PerspectiveBarProps['workspace']) {
  const tags = new Set<string>();
  const statuses = new Set<string>();
  const technologies = new Set<string>();

  const collect = (obj: {
    tags?: string[];
    status?: string;
    technologies?: string[];
  }) => {
    obj.tags?.forEach((t) => tags.add(t));
    if (obj.status) statuses.add(obj.status);
    obj.technologies?.forEach((t) => technologies.add(t));
  };

  workspace.objects?.forEach((obj) => collect(obj));
  workspace.people?.forEach((person) => collect(person));

  return { tags, statuses, technologies };
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * PerspectiveBar – Floating, collapsible bottom bar with three rows of filter badges.
 *
 * Replaces the old FilterSidebar tab-based model with an always-visible
 * badge bar. Each badge toggles through three states:
 * Neutral → Focus → Hide → Neutral.
 *
 * Badge states, hover, and filter actions are read from the VisceraStore
 * (FilterSlice) instead of props (moved in Increment 4).
 */
export default function PerspectiveBar({ workspace }: PerspectiveBarProps) {
  const isCollapsed = useVisceraStore(selectPanelCollapsed);
  const { tagMap, statusMap, technologyMap, loading } = useEntityCache();

  // ── Read filter state from store ───────────────────────────────────────────
  const badgeStates = useVisceraStore(selectBadgeStates);
  const hoveredKey = useVisceraStore(selectHoveredKey);
  const activeFilterCount = useVisceraStore(selectActiveFilterCount);

  // ── Store actions (stable refs from zustand) ───────────────────────────────
  const toggleBadge = useVisceraStore((s) => s.toggleBadge);
  const setHover = useVisceraStore((s) => s.setHover);
  const resetAll = useVisceraStore((s) => s.resetAll);
  const togglePanelCollapse = useVisceraStore((s) => s.togglePanelCollapse);

  // ── Collect unique slugs per entity type from workspace ───────────────────
  const slugs = useMemo(() => collectSlugs(workspace), [workspace]);

  // ── Build rows ────────────────────────────────────────────────────────────
  const toItems = (slugsArr: string[], map: Map<string, EntityData>, entityType: EntityType): BadgeRowItem[] =>
    slugsArr.map((slug) => ({ slug, entityType, entityData: map.get(slug) }));

  const rows: { label: string; items: BadgeRowItem[] }[] = [
    {
      label: 'Tags',
      items: toItems(sortByGroupThenOrder([...slugs.tags], tagMap), tagMap, 'tag'),
    },
    {
      label: 'Status',
      items: toItems(sortByGroupThenOrder([...slugs.statuses], statusMap), statusMap, 'status'),
    },
    {
      label: 'Technology',
      items: toItems([...slugs.technologies].sort(), technologyMap, 'technology'),
    },
  ];

  // ── Badge state helper ────────────────────────────────────────────────────
  const getBadgeState = (entityType: EntityType, slug: string): BadgeState | undefined => {
    return badgeStates.get(badgeKey(entityType, slug));
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <footer className="flex items-center justify-center gap-2 border-t border-border bg-background px-4 py-2">
        <Icon name="loader-2" size="sm" />
        <Text variant="caption" size="xs" color="muted">
          Loading entities…
        </Text>
      </footer>
    );
  }

  // ── Render badge for a single slug ────────────────────────────────────────
  const renderBadge = (item: BadgeRowItem) => {
    const badge = getBadgeState(item.entityType, item.slug);
    const state = badge?.state ?? 'neutral';
    const key = badgeKey(item.entityType, item.slug);
    const isHovered = hoveredKey === key;
    const colorToken = (item.entityData?.colorToken ?? 'gray') as ColorToken;
    const css = COLOR_TOKEN_CSS[colorToken];
    const isFocusActive = state === 'focus';
    const isHidden = state === 'hide';

    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        onClick={() => toggleBadge(item.entityType, item.slug)}
        onMouseEnter={() => setHover(key)}
        onMouseLeave={() => setHover(null)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleBadge(item.entityType, item.slug); }}
        className={cn(
          'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-all select-none',
          css.bg,
          css.text,
          css.border,
          isFocusActive && 'ring-2 ring-offset-1 brightness-110',
          isHovered && !isFocusActive && 'ring-2 ring-offset-1 brightness-110',
          isHovered && !isFocusActive && css.ring,
          isHidden && 'opacity-40 line-through',
        )}
        aria-label={`${item.entityType} ${item.entityType === 'tag' && item.entityData?.category ? `${item.entityData.category}: ` : ''}${item.entityData?.name ?? item.slug}, ${state}${isFocusActive ? ', aktiv' : ''}`}
      >
        {item.entityType === 'tag' && item.entityData?.category
          ? `${item.entityData.category}: ${item.entityData.name}`
          : (item.entityData?.name ?? item.slug)}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <footer className="border-t-2 border-gray-300 dark:border-gray-600 bg-background shadow-toolbar">
      {/* Header row: toggle + reset */}
      <nav className="flex items-center justify-between px-3 py-1.5">
        <Button
          variant="ghost"
          size="xs"
          onClick={togglePanelCollapse}
          aria-label={isCollapsed ? 'Expand filter bar' : 'Collapse filter bar'}
        >
          <Icon
            name={isCollapsed ? 'chevron-right' : 'chevron-down'}
            size="sm"
            aria-hidden
          />
          {isCollapsed && activeFilterCount > 0 && (
            <Text variant="body" size="xs" color="muted">
              {activeFilterCount} active
            </Text>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="xs" onClick={resetAll}>
            Reset all ({activeFilterCount})
          </Button>
        )}
      </nav>

      {/* Badge rows – hidden when collapsed */}
      {!isCollapsed && (
        <section className="flex flex-col gap-1.5 px-3 pb-2">
          {rows.map((row) => (
            <section key={row.label} className="flex items-start gap-2">
              {/* Row label */}
              <div className="basis-20 shrink-0 pt-1.5">
                <Text
                  variant="caption"
                  size="xs"
                  weight="semibold"
                  uppercase
                  color="muted"
                >
                  {row.label}
                </Text>
              </div>

              {/* Badge list */}
              <section className="flex flex-wrap gap-1 overflow-x-auto">
                {row.items.length === 0 && (
                  <Text variant="caption" size="xs" color="muted">
                    —
                  </Text>
                )}
                {row.items.map(renderBadge)}
              </section>
            </section>
          ))}
        </section>
      )}
    </footer>
  );
}

/** Sort slugs by category alphabetically, then by sortOrder within each category. */
function sortByGroupThenOrder(slugs: string[], map: Map<string, EntityData>): string[] {
  return [...slugs].sort((a, b) => {
    const aData = map.get(a);
    const bData = map.get(b);
    const aCat = aData?.category ?? '';
    const bCat = bData?.category ?? '';
    if (aCat !== bCat) return aCat.localeCompare(bCat);
    return (aData?.sortOrder ?? 0) - (bData?.sortOrder ?? 0);
  });
}
