import { useDraggable } from '@dnd-kit/core';
import { useNodeId } from '@xyflow/react';
import { cva } from 'class-variance-authority';
import { memo, useMemo } from 'react';

import { useEntityCache } from '@src/features/viscera/core/useEntityCache';
import type { TableColumn } from '@src/features/viscera/core/workspaceSchema';
import { COLOR_TOKEN_CSS, type ColorToken } from '@src/lib/colorTokens';

import NodeEdgeHandles from './NodeEdgeHandles';

import type { CardDragData } from '../../utils/dndTypes';
import type { NodeProps } from '@xyflow/react';

// ── Node Data ───────────────────────────────────────────────────────────────

interface SqlTableNodeData {
  /** Table name = stable node id. */
  name: string;
  /** Optional curated node description. */
  description?: string;
  /** Columns rendered as rows (INC 3.1: objectSchema.columns). */
  columns?: TableColumn[];
  /** Lifecycle-Status-Slug (viscera-*) – bestimmt die S1-Statusfarbe wie bei den Cards. */
  status?: string;
  dimmed?: boolean;
  hidden?: boolean;
}

type SqlTableNodeProps = NodeProps & { data: SqlTableNodeData };

const columnRowVariants = cva(
  'flex items-center gap-2 border-b border-gray-100 px-2 py-1 last:border-b-0 dark:border-gray-800',
);
const columnNameVariants = cva('flex-1 truncate text-xs text-gray-800 dark:text-gray-200');
const badgeNullVariants = cva(
  'rounded px-1 text-3xs font-semibold leading-none text-gray-400 dark:text-gray-500',
);
const columnTypeVariants = cva(
  'max-w-28 truncate font-mono text-2xs text-gray-400 dark:text-gray-500',
);
const descriptionVariants = cva('truncate text-2xs text-gray-500');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Badge config for a column's PK/FK flags (a column can be both). */
function columnBadges(column: TableColumn): { label: string; className: string }[] {
  const badges: { label: string; className: string }[] = [];
  if (column.pk) {
    badges.push({ label: 'PK', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' });
  }
  if (column.fk) {
    badges.push({ label: 'FK', className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' });
  }
  return badges;
}

// ── Component ───────────────────────────────────────────────────────────────

function SqlTableNode({ data }: SqlTableNodeProps) {
  const { name, description, columns, status, dimmed, hidden } = data;

  // ── @dnd-kit dragging (#2294): ER-Tabellen einzeln verschiebbar machen.
  // React Flow rendert nur (nodesDraggable=false); die DB-Karte ist das
  // Draggable (Muster CardNode). VisceraDndContext übernimmt Grid-Snap,
  // Live-Move, Hilfslinien und Persistenz über `dndType: 'card'`.
  const nodeId = useNodeId() ?? '';
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: nodeId,
    data: { dndType: 'card' } satisfies CardDragData,
  });

  // ── Statusfarbe (#2523): ER-Tabellen tragen die S1-Statusfarbe wie die
  // Cards (CardNode) – Border (45 %), Kopfzeilen-Tint (15 %) und Titel-Schrift.
  // Unbekannter/fehlender Status → neutrale Klassen (wie bisher).
  const { statusMap } = useEntityCache();
  const statusCss = useMemo(() => {
    if (!status) return undefined;
    const entity = statusMap.get(status);
    const token = entity?.colorToken as ColorToken | undefined;
    return token ? COLOR_TOKEN_CSS[token] : undefined;
  }, [status, statusMap]);

  const borderClass = statusCss?.border ?? 'border-gray-300 dark:border-gray-700';
  const headerClass = statusCss
    ? `${statusCss.bg} border-b border-gray-200 dark:border-gray-700`
    : 'border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800';
  const titleClass =
    statusCss?.text ?? 'text-gray-900 dark:text-gray-100';
  // Status-Wash ueber den GESAMTEN Body (nicht nur Header): die DB-Karte traegt
  // die S1-Statusfarbe wie die C4-Cards (CardBackground 15 %-Tint ueber der ganzen Flaeche).
  const bodyClass = statusCss?.bg ?? 'bg-white dark:bg-gray-900';

  if (hidden) return null;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex cursor-grab flex-col overflow-hidden rounded border bg-white shadow-sm dark:bg-gray-900 nopan ${borderClass}`}
      style={
        {
          opacity: dimmed ? 0.3 : 1,
          '--card-status-color': statusCss?.hex,
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <div className={`px-2 py-1 ${headerClass}`}>
        <div className={`truncate font-mono text-xs font-semibold ${titleClass}`}>
          {name}
        </div>
      </div>

      {/* Column rows */}
      <div className={`flex flex-col ${bodyClass}`}>
        {columns?.map((column) => (
          <div
            key={column.name}
            className={columnRowVariants()}
          >
            <div className={columnNameVariants()}>
              {column.name}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {columnBadges(column).map(({ label, className }) => (
                <div key={label} className={`rounded px-1 text-3xs font-semibold leading-none ${className}`}>
                  {label}
                </div>
              ))}
              {column.nullable === true && (
                <div className={badgeNullVariants()}>
                  NULL
                </div>
              )}
              {column.type && (
                <div className={columnTypeVariants()}>
                  {column.type}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {description && (
        <div className={`px-2 py-1 ${bodyClass}`}>
          <div className={descriptionVariants()}>
            {description}
          </div>
        </div>
      )}

      {/* Edge Handles – FK-Kanten benötigen source/target (dto. CardNode/FileNode). */}
      <NodeEdgeHandles />
    </div>
  );
}

export default memo(SqlTableNode);
