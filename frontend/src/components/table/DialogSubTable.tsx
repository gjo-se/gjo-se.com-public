/**
 * DialogSubTable – generische DnD-Sub-Tabelle für Dialog-lokale Zeilenmodelle.
 *
 * Kapselt das in `ExperienceDialog` kopierte Muster: DnD-Reorder über stabile
 * Client-Keys, Ghost-Row (Zeile anhängen), Delete und Translation-Feld-Update
 * über `setField`. Aufrufer liefern Titel, Header (`columns`), die Zeilen- und
 * Feld-Logik.
 */

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useMemo, type ReactNode } from 'react';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';
import TableBody from '@src/components/table/TableBody';
import TableCell from '@src/components/table/TableCell';
import TableHeader from '@src/components/table/TableHeader';
import TableRoot from '@src/components/table/TableRoot';

export interface DialogSubTableProps<T extends { key: string }> {
  title: string;
  subtitle: string;
  items: T[];
  /** Header row (`<tr>` of `TableHead`). */
  columns: ReactNode;
  /** Column count for the empty state + add row. */
  colSpan: number;
  emptyText: string;
  addLabel: string;
  /** Creates a fresh empty row (with a stable client key). */
  createRow: () => T;
  /** Active locale (passed to `setField` + `renderRow`). */
  locale: string;
  onChange: (items: T[]) => void;
  /** Immutably sets one locale field on a row. */
  setField: (item: T, locale: string, field: string, value: string) => T;
  /** Renders one sortable row; wire `onFieldChange`/`onDelete` into the row. */
  renderRow: (
    item: T,
    onFieldChange: (key: string, field: string, value: string) => void,
    onDelete: (key: string) => void,
  ) => ReactNode;
}

/** Generic DnD sub-table for dialog-local translation rows. */
export function DialogSubTable<T extends { key: string }>({
  title,
  subtitle,
  items,
  columns,
  colSpan,
  emptyText,
  addLabel,
  createRow,
  locale,
  onChange,
  setField,
  renderRow,
}: DialogSubTableProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const rowIds = useMemo(() => items.map((item) => item.key), [items]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((item) => item.key === active.id);
      const newIndex = items.findIndex((item) => item.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onChange(arrayMove(items, oldIndex, newIndex));
    },
    [items, onChange],
  );

  const handleFieldChange = useCallback(
    (key: string, field: string, value: string) => {
      onChange(items.map((item) => (item.key === key ? setField(item, locale, field, value) : item)));
    },
    [items, locale, onChange, setField],
  );

  const handleDelete = useCallback(
    (key: string) => {
      onChange(items.filter((item) => item.key !== key));
    },
    [items, onChange],
  );

  const handleAdd = useCallback(() => {
    onChange([...items, createRow()]);
  }, [items, onChange, createRow]);

  return (
    <section className="flex flex-col gap-2">
      <Text as="h4" variant="h6">
        {title}
      </Text>
      <Text size="xs" color="muted">
        {subtitle}
      </Text>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <TableRoot>
          <TableHeader>{columns}</TableHeader>
          <TableBody>
            <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
              {items.length === 0 ? (
                <tr>
                  <TableCell colSpan={colSpan}>
                    <div className="py-4 text-center">
                      <Text size="sm" color="muted">
                        {emptyText}
                      </Text>
                    </div>
                  </TableCell>
                </tr>
              ) : (
                items.map((item) => renderRow(item, handleFieldChange, handleDelete))
              )}
            </SortableContext>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <TableCell colSpan={colSpan}>
                <Button variant="ghost" size="sm" onClick={handleAdd}>
                  {addLabel}
                </Button>
              </TableCell>
            </tr>
          </TableBody>
        </TableRoot>
      </DndContext>
    </section>
  );
}
