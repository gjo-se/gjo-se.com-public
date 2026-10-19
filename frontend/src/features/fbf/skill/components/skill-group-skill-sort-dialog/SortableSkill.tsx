import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Button from '@src/components/primitives/Button';
import Text from '@src/components/primitives/Text';

import type { SkillAdminOut } from '../../services/curation';

interface SortableSkillProps {
  skill: SkillAdminOut;
}

/** Single draggable skill row used inside the sort dialog. */
export default function SortableSkill({ skill }: SortableSkillProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: skill.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 rounded border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
    >
      <Button
        type="button"
        variant="ghost"
        size="xs"
        aria-label={`${skill.name} verschieben`}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </Button>
      <Text size="sm">{skill.name}</Text>
    </li>
  );
}
