import { cva } from 'class-variance-authority';
import { useCallback, useMemo, useState } from 'react';

import Button from '@src/components/primitives/Button/Button';
import Chip from '@src/components/primitives/Chip/Chip';
import type { ChipVariants } from '@src/components/primitives/Chip/Chip.variants';
import Text from '@src/components/primitives/Text/Text';

import { buildVisibleTree } from '../../utils/modelTree';

import type { ModelObject, ModelObjectType } from '../../hooks/useModelExplorer';

// ── Badge Color Map ───────────────────────────────────────────────────────────

const TYPE_CHIP_VARIANT: Record<ModelObjectType, ChipVariants['variant']> = {
  system: 'info',
  container: 'success',
  component: 'warning',
  person: 'muted',
  store: 'primary',
  table: 'secondary',
};

const COLUMNS = ['Name', 'Status', 'Children', 'Edges', 'In diagrams'] as const;

const spacerVariants = cva('size-6 shrink-0');

// ── Props ──────────────────────────────────────────────────────────────────────

export interface ModelTreeProps {
  objects: ModelObject[];
  onObjectClick?: (id: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

/**
 * Presentational tree/grid component for model objects.
 *
 * Renders an expandable tree-table:
 * - Top-level: systems, stores, persons
 * - Expanded systems show containers
 * - Expanded containers show components
 *
 * No data fetching or business logic – receives all data via props.
 */
export default function ModelTree({ objects, onObjectClick }: ModelTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const visibleNodes = useMemo(
    () => buildVisibleTree(objects, expandedIds),
    [objects, expandedIds],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (objects.length === 0) {
    return <Text variant="body" align="center">No objects to display.</Text>;
  }

  return (
    <table className="w-full overflow-x-auto rounded-lg border text-sm">
      <thead>
        <tr className="border-b bg-muted text-left">
          {COLUMNS.map((col) => (
            <th
              key={col}
              className="px-4 py-2.5 font-medium text-on-surface-secondary"
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleNodes.map((node) => {
          const { object, depth, hasChildren } = node;
          const isExpanded = expandedIds.has(object.id);
          const indentPx = depth * 20;

          return (
            <tr
              key={object.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              {/* Name + Type Badge */}
              <td className="px-4 py-2" style={{ paddingLeft: `${indentPx + 16}px` }}>
                <div className="flex items-center gap-2">
                  {hasChildren ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => toggleExpand(object.id)}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M6 4l4 4-4 4V4z" />
                      </svg>
                    </Button>
                  ) : (
                    <div className={spacerVariants()} aria-hidden="true" />
                  )}
                  <Chip variant={TYPE_CHIP_VARIANT[object.type]} size="sm">
                    {object.type}
                  </Chip>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => onObjectClick?.(object.id)}
                  >
                    {object.name}
                  </Button>
                </div>
              </td>

              {/* Status */}
              <td className="px-4 py-2 text-on-surface-subtle">
                {object.status ?? '\u2014'}
              </td>

              {/* Children */}
              <td className="px-4 py-2 text-center text-on-surface-subtle">
                {object.childrenCount}
              </td>

              {/* Edges */}
              <td className="px-4 py-2 text-center text-on-surface-subtle">
                {object.edgesCount}
              </td>

              {/* In diagrams */}
              <td className="px-4 py-2 text-center text-on-surface-subtle">
                {object.diagramsCount}
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={COLUMNS.length} className="border-t px-4 py-2 text-xs text-on-surface-subtle">
            Total objects: {objects.length}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
