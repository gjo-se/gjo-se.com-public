/**
 * DragHandle – ⋮⋮ grab button for sortable table rows.
 *
 * Single shared handle for all sortable rows; spreads the dnd-kit sortable
 * listeners/attributes returned by ``useSortableRow``. The associated
 * `touch-none` is also set here so touch dragging works out of the box.
 */
import Button from '@src/components/primitives/Button';

import type { useSortable } from '@dnd-kit/sortable';

/** Sortable props handed to the drag handle (optional – disabled rows pass none). */
export type DragHandleProps = Partial<Pick<
  ReturnType<typeof useSortable>,
  'listeners' | 'attributes'
>>;

/** ⋮⋮ drag handle spreading sortable listeners. */
export default function DragHandle({ listeners, attributes }: DragHandleProps) {
  return (
    <Button
      variant="drag"
      size="icon-xs"
      aria-label="Zeile ziehen zum Sortieren"
      {...listeners}
      {...attributes}
    >
      ⋮⋮
    </Button>
  );
}
