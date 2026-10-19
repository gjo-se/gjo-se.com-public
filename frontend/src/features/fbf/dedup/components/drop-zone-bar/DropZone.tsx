/**
 * DropZone – Single droppable target for the status drop row.
 *
 * Highlights on hover with zone-specific colors (status colors follow the
 * board badges: deprecated = destructive, pending = blue, active = green,
 * rejected = gray).
 */

import { useDroppable } from '@dnd-kit/core';

import Icon from '@src/components/primitives/Icon/Icon';
import type { IconName } from '@src/components/primitives/Icon/Icon.registry';
import Text from '@src/components/primitives/Text';

import type { DroppableData } from '../dedup-dnd-context/DedupDndContext';

interface DropZoneProps {
  zone: 'deprecated' | 'pending' | 'active' | 'unassign' | 'new-master' | 'rejected'
  label: string
  iconName: IconName
}

const ZONE_HOVER_CLASSES: Record<DropZoneProps['zone'], string> = {
  'deprecated': 'border-destructive bg-destructive/10 text-destructive',
  'pending': 'border-blue-500 bg-blue-500/10 text-blue-600',
  'active': 'border-green-600 bg-green-600/10 text-green-700',
  'new-master': 'border-amber-500 bg-amber-500/10 text-amber-600',
  'unassign': 'border-primary bg-primary/10 text-primary',
  'rejected': 'border-gray-500 bg-gray-500/10 text-gray-600',
};

/** A single drop zone target for status actions (deprecated / pending / active / rejected). */
export default function DropZone({ zone, label, iconName }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `zone-${zone}`,
    data: { zone } satisfies DroppableData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-background/95 px-4 py-2 shadow-lg transition-colors ${
        isOver ? ZONE_HOVER_CLASSES[zone] : 'border-border text-muted-foreground'
      }`}
    >
      <Icon name={iconName} />
      <Text size="sm" weight="medium">{label}</Text>
    </div>
  );
}
