/**
 * useSortableRow – shared dnd-kit plumbing for sortable table rows.
 *
 * Encapsulates the `useSortable` wiring, the translate/opacity/zIndex style
 * object and the drag props handed to a drag handle. Replaces the copy-pasted
 * block in the Proof, SkillGroup, Portfolio, Experience, Decision and Career
 * sortable rows.
 */
import { useSortable } from '@dnd-kit/sortable';

import type { CSSProperties } from 'react';

type UseSortableReturn = ReturnType<typeof useSortable>;

export interface UseSortableRowOptions {
  /** Disables dragging for this row. */
  disabled?: boolean
  /** Fixed row height in px; when omitted, `touchAction: 'none'` is applied instead. */
  rowHeight?: number
}

export interface UseSortableRowResult {
  /** Ref for the `<tr>` element. */
  setNodeRef: UseSortableReturn['setNodeRef']
  /** Row style (transform/transition/opacity/zIndex + height or touchAction). */
  style: CSSProperties
  /** Props to spread onto the drag handle. */
  dragProps: Pick<UseSortableReturn, 'listeners' | 'attributes'>
  isDragging: boolean
}

/**
 *
 */
export function useSortableRow(
  id: number | string,
  { disabled = false, rowHeight }: UseSortableRowOptions = {},
): UseSortableRowResult {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined,
    transition,
    opacity: isDragging ? 0.3 : undefined,
    position: 'relative',
    zIndex: isDragging ? 1 : 0,
    ...(rowHeight != null ? { height: rowHeight } : { touchAction: 'none' }),
  };

  return { setNodeRef, style, dragProps: { listeners, attributes }, isDragging };
}
