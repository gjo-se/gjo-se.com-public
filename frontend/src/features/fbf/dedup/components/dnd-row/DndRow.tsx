/**
 * DndRow – Unified DnD wrapper replacing 5 separate DraggableRow / DroppableRow components.
 *
 * Roles:
 *   source  – useDraggable only (SP1 cards, SP3 slave cards, alias rows)
 *   target  – useDroppable only (SP3 pinned master panel, suggestion cards)
 *   both    – useDraggable + useDroppable nested (SP2 master rows)
 */

import { useDraggable, useDroppable } from '@dnd-kit/core';

import { useDedupStore } from '../../store/dedupStore';

import type { DraggableData, DroppableData } from '../../utils/dndTypes';

// ── Types ──────────────────────────────────────────────────────────────────

type DndChildren = React.ReactNode | ((isOver: boolean) => React.ReactNode);

interface DndRowBoth {
  role: 'both'
  id: string
  data: DraggableData
  dropId: string
  dropData: DroppableData
  children: DndChildren
}

export type DndRowProps = DndRowSource | DndRowTarget | DndRowBoth;

interface DndRowSource {
  role: 'source'
  id: string
  data: DraggableData
  children: DndChildren
}

interface DndRowTarget {
  role: 'target'
  id: string
  data: DroppableData
  children: DndChildren
}

/**
 *
 */
export default function DndRow({ role, ...rest }: DndRowProps) {
  const { id = '', data = {} as DraggableData } = rest as Record<string, unknown>;
  const { dropId = '', dropData = {} as DroppableData } = rest as Record<string, unknown>;
  const { children = null } = rest as Record<string, unknown>;

  // Always call hooks unconditionally (Rules of Hooks).
  const dragActive = useDedupStore((s) => s.dragActive);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable(
    role === 'source' || role === 'both'
      ? { id: String(id), data: data as DraggableData }
      : { id: 'unused-draggable-id' },
  );

  const { setNodeRef: setDropRef, isOver } = useDroppable(
    role === 'target' || role === 'both'
      ? {
        id: role === 'both' ? String(dropId) : String(id),
        data: role === 'both' ? (dropData as DroppableData) : (data as DroppableData),
      }
      : { id: 'unused-droppable-id' },
  );

  // ── role = source ──────────────────────────────────────────────────────
  if (role === 'source') {
    return (
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={isDragging ? 'opacity-50' : ''}
        style={{ cursor: 'grab' }}
      >
        {children as React.ReactNode}
      </div>
    );
  }

  // ── role = target ──────────────────────────────────────────────────────
  if (role === 'target') {
    const ringClass = isOver ? 'ring-2 ring-primary/40 rounded-lg' : '';
    return <div ref={setDropRef} className={ringClass}>{renderChildren(children as DndChildren, isOver)}</div>;
  }

  // ── role = both ────────────────────────────────────────────────────────
  const zoneClasses = isOver
    ? 'rounded-xl outline-2 outline-amber-500'
    : dragActive
      ? 'rounded-xl outline-2 outline-dashed outline-amber-400/60'
      : '';

  return (
    <div ref={setDropRef} className={`transition-colors ${zoneClasses}`}>
      <div
        ref={setDragRef}
        {...listeners}
        {...attributes}
        className={`cursor-grab ${isDragging ? 'opacity-50' : ''}`}
      >
        {renderChildren(children as DndChildren, isOver)}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

/** Helper: render children, which can be a ReactNode or a render-prop (isOver) => ReactNode. */
function renderChildren(children: DndChildren, isOver: boolean): React.ReactNode {
  return typeof children === 'function'
    ? (children as (isOver: boolean) => React.ReactNode)(isOver)
    : children;
}
