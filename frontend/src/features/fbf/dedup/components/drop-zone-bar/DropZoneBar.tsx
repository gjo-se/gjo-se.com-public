/**
 * DropZoneBar – Status drop row between the toolbar row and the board row.
 *
 * Takes NO layout space: a zero-height relative container hosts an absolute
 * overlay that fades in during a drag and simply lays over the surrounding
 * rows (centered on the toolbar/board seam via -translate-y-1/2) – nothing
 * shifts. Four drop targets: left column = deprecated + rejected (stacked),
 * center = pending, right = active.
 * Always mounted so dnd-kit can measure the droppable rects reliably;
 * pointer-events stay disabled because dnd-kit collision detection is
 * rect-based.
 */

import { useDndMonitor } from '@dnd-kit/core';
import { useState } from 'react';

import DropZone from './DropZone';

/** Status drop row (deprecated / pending / active / rejected), overlaid only during drag. */
export default function DropZoneBar() {
  const [isDragging, setIsDragging] = useState(false);

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  return (
    <div className={`relative h-0 ${isDragging ? 'z-30' : 'z-0'}`}>
      <div
        aria-hidden={!isDragging}
        className={`pointer-events-none absolute inset-x-0 top-0 grid -translate-y-1/2 grid-cols-1 gap-4 transition-opacity duration-200 lg:grid-cols-3 ${
          isDragging ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1">
          <DropZone zone="deprecated" label="deprecated" iconName="archive" />
          <DropZone zone="rejected" label="rejected" iconName="x-circle" />
        </div>
        <DropZone zone="pending" label="pending" iconName="refresh-cw" />
        <DropZone zone="active" label="active" iconName="check-circle" />
      </div>
    </div>
  );
}
