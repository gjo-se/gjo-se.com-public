import { cva } from 'class-variance-authority';
import { useRef } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Text from '@src/components/primitives/Text/Text';
import { useEntityCache } from '@src/features/viscera/core/useEntityCache';

import ModelViewerLines from './ModelViewerLines';

import type { ModelViewerProps, NormalizedModelObject } from '../../utils/modelViewerTypes';
// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_BADGE_COLORS: Record<NormalizedModelObject['type'], string> = {
  system: '#e94560', container: '#1a1a2e', component: '#0f3460', person: '#533483',
};
const TYPE_LABELS: Record<NormalizedModelObject['type'], string> = {
  system: 'System', container: 'Container', component: 'Component', person: 'Person',
};
const typeBadgeVariants = cva('inline-block rounded px-2 py-0.5 font-bold text-white');
const titleVariants = cva('mb-1 truncate');
const tagVariants = cva('rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-700');
const idVariants = cva('truncate opacity-50');
// ── Component ─────────────────────────────────────────────────────────────────
/** Grid-Ansicht aller Modellobjekte mit Drill-down. Edge-Lines via ModelViewerLines. */
export default function ModelViewer({
  objects,
  edges,
  selectedObjectId,
  hoveredObjectId,
  onObjectClick,
  onObjectHover,
  onEdgeClick,
  onToggleExpand,
  expandedIds,
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { technologyMap } = useEntityCache();
  // Determine connected IDs for the hovered object
  const connectedIds = new Set<string>();
  edges.forEach((edge) => {
    if (edge.from === hoveredObjectId) connectedIds.add(edge.to);
    if (edge.to === hoveredObjectId) connectedIds.add(edge.from);
  });
  // Group objects by parentId for drill-down rendering
  const topLevel = objects.filter((o) => !o.parentId || !objects.some((p) => p.id === o.parentId));
  const childrenByParent = new Map<string, NormalizedModelObject[]>();
  objects.forEach((obj) => {
    if (obj.parentId) {
      const siblings = childrenByParent.get(obj.parentId) ?? [];
      siblings.push(obj);
      childrenByParent.set(obj.parentId, siblings);
    }
  });
  // Build ordered list: top-level + expanded children inline
  function buildOrderedList(): NormalizedModelObject[] {
    const result: NormalizedModelObject[] = [];
    const addWithChildren = (item: NormalizedModelObject): void => {
      result.push(item);
      if (expandedIds.has(item.id)) {
        (childrenByParent.get(item.id) ?? []).forEach(addWithChildren);
      }
    };
    topLevel.forEach(addWithChildren);
    return result;
  }
  const orderedObjects = buildOrderedList();
  return (
    <div ref={containerRef} className="relative">
      <ModelViewerLines
        containerRef={containerRef}
        objects={objects}
        edges={edges}
        onEdgeClick={onEdgeClick}
      />
      {/* Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          position: 'relative',
          zIndex: 0,
        }}
      >
        {orderedObjects.map((obj) => {
          const isSelected = selectedObjectId === obj.id;
          const isHovered = hoveredObjectId === obj.id;
          const isConnected = hoveredObjectId ? connectedIds.has(obj.id) : false;
          const isExpanded = expandedIds.has(obj.id);
          const techSlug = obj.technologies?.[0];
          const technologyName = techSlug ? (technologyMap.get(techSlug)?.name ?? techSlug) : undefined;
          return (
            <div
              key={obj.id}
              data-object-id={obj.id}
              className={`relative rounded-lg border-2 bg-white p-4 transition-shadow dark:bg-gray-800 ${
                isSelected
                  ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800'
                  : isConnected
                    ? 'border-blue-300 shadow-md dark:border-blue-700'
                    : 'border-gray-200 dark:border-gray-700'
              } ${isHovered ? 'shadow-lg' : 'shadow-sm'}`}
              style={{ cursor: 'pointer' }}
              onClick={() => onObjectClick(obj.id)}
              onMouseEnter={() => onObjectHover(obj.id)}
              onMouseLeave={() => onObjectHover(null)}
            >
              {/* Header: Type badge + Expand button */}
              <div className="mb-2 flex items-center justify-between">
                <div
                  className={typeBadgeVariants()}
                  style={{ backgroundColor: TYPE_BADGE_COLORS[obj.type] }}
                >
                  <Text variant="caption" color="inherit" weight="bold">
                    {TYPE_LABELS[obj.type]}
                  </Text>
                </div>
                {obj.hasChildren && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(obj.id);
                    }}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                )}
              </div>
              {/* Name */}
              <div className={titleVariants()}>
                <Text variant="body" weight="semibold" size="sm">
                  {obj.name}
                </Text>
              </div>
              {/* Technology (containers/components) */}
              {technologyName && (
                <div className={titleVariants()}>
                  <Text variant="caption">{technologyName}</Text>
                </div>
              )}
              {/* Description */}
              {obj.description && (
                <div className="mb-2">
                  <Text variant="caption" lineClamp={2}>{obj.description}</Text>
                </div>
              )}
              {/* Tags */}
              {obj.tags && obj.tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {obj.tags.slice(0, 3).map((tag) => (
                    <div key={tag} className={tagVariants()}>
                      <Text variant="caption">{tag}</Text>
                    </div>
                  ))}
                </div>
              )}
              {/* Footer: Edge count + ID */}
              <div className="flex items-center justify-between">
                <Text as="span">{obj.edgesCount} edges</Text>
                <div className={idVariants()}>
                  <Text as="span" variant="caption" mono>{obj.id}</Text>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { EdgeLine, NormalizedModelObject, ModelViewerProps } from '../../utils/modelViewerTypes';
