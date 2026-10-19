/**
 * SortableTable – generische Drag&Drop-Tabelle (DnD-Context + Compound-Markup).
 *
 * Kapselt das in FE-Table-Komponenten kopierte Muster aus
 * `DndContext` + `TableRoot` + `TableHeader`/`TableBody` + `SortableContext` +
 * `DragOverlay` inkl. Sensoren, Aktiv-Zeile, leerem Zustand, optionalem
 * DetailTable-Container/Header, Toolbar und Sortier-Gate. Aufrufer liefern nur
 * `columns`, `renderRow`, `renderOverlay` und `onReorder`.
 */

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import Text from '@src/components/primitives/Text';
import TableBody from '@src/components/table/TableBody';
import TableHead from '@src/components/table/TableHead';
import TableHeader from '@src/components/table/TableHeader';
import TableRoot from '@src/components/table/TableRoot';

// ── Types ────────────────────────────────────────────────────────────────

export interface SortableColumn {
  key: string;
  label: string;
  compact?: boolean;
  width?: string;
}

export type SortableId = string | number;

export interface SortableTableProps<T> {
  /** Section header label; rendered as `${label} (${items.length})` (container only). */
  label?: string;
  items: T[];
  columns: SortableColumn[];
  /** Row id (also the DnD id). */
  getRowId: (item: T) => SortableId;
  /** Persists the new order (sync or async). Required unless `sortableEnabled={false}`. */
  onReorder?: (orderedIds: SortableId[]) => unknown;
  /** Renders one sortable row (set the React `key` here). */
  renderRow: (item: T) => ReactNode;
  /** Renders the drag overlay row for the active item. */
  renderOverlay?: (item: T) => ReactNode;
  loading?: boolean;
  /** Load error; replaces the table with an error placeholder. */
  errorText?: string | null;
  emptyText: string;
  /** When true, an empty list shows the ghost row instead of the empty state. */
  ghostOpen?: boolean;
  /** Optional ghost row element rendered after the rows. */
  ghostRow?: ReactNode;
  /** Ghost/validation error shown below the table. */
  ghostError?: string | null;
  /** Disables drag&drop (e.g. while a search filter is active). Default true. */
  sortableEnabled?: boolean;
  /** Optional toolbar rendered above the container. */
  toolbar?: ReactNode;
  /** Renders the DetailTable container + header box. Default true. */
  container?: boolean;
}

// ── DetailTable Style Tokens ──────────────────────────────────────────────

const CONTAINER =
  'overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm dark:shadow-none';

const HEADER =
  'border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2';

const PLACEHOLDER = 'py-4 px-4';

// ── Component ────────────────────────────────────────────────────────────

/** Generic drag&drop table with header, empty state and drag overlay. */
export function SortableTable<T>({
  label,
  items,
  columns,
  getRowId,
  onReorder,
  renderRow,
  renderOverlay,
  loading = false,
  errorText,
  emptyText,
  ghostOpen = false,
  ghostRow,
  ghostError,
  sortableEnabled = true,
  toolbar,
  container = true,
}: SortableTableProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const [activeId, setActiveId] = useState<SortableId | null>(null);
  const activeItem = useMemo(
    () => items.find((item) => getRowId(item) === activeId) ?? null,
    [items, activeId, getRowId],
  );
  const ids = useMemo(() => items.map(getRowId), [items, getRowId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as SortableId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      if (!sortableEnabled) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((item) => getRowId(item) === active.id);
      const newIndex = items.findIndex((item) => getRowId(item) === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      void onReorder?.(reordered.map(getRowId));
    },
    [items, getRowId, onReorder, sortableEnabled],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const table = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <TableRoot style={container ? { tableLayout: 'fixed' } : undefined}>
        <TableHeader>
          <tr>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                compact={col.compact}
                style={col.width ? { maxWidth: col.width, width: col.width } : undefined}
              >
                {col.label}
              </TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          <SortableContext items={sortableEnabled ? ids : []} strategy={verticalListSortingStrategy}>
            {items.length === 0 && !ghostOpen ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center">
                  <Text size="sm" color="muted">
                    {emptyText}
                  </Text>
                </td>
              </tr>
            ) : (
              items.map((item) => renderRow(item))
            )}
            {ghostRow}
          </SortableContext>
        </TableBody>
      </TableRoot>

      <DragOverlay dropAnimation={null}>
        {activeItem && renderOverlay ? renderOverlay(activeItem) : null}
      </DragOverlay>
    </DndContext>
  );

  const body = loading ? (
    <div className={PLACEHOLDER}>
      <Text size="sm" color="muted">
        Laden…
      </Text>
    </div>
  ) : errorText ? (
    <div className={PLACEHOLDER}>
      <Text size="sm" color="error">
        {errorText}
      </Text>
    </div>
  ) : (
    table
  );

  return (
    <>
      {toolbar}
      <div className={container ? CONTAINER : undefined}>
        {container && label && (
          <div className={HEADER}>
            <Text as="span" size="xs" weight="medium" uppercase color="muted">
              {label} ({items.length})
            </Text>
          </div>
        )}
        {body}
        {ghostError && (
          <div className="px-4 pb-2">
            <Text size="xs" color="error">
              {ghostError}
            </Text>
          </div>
        )}
      </div>
    </>
  );
}
