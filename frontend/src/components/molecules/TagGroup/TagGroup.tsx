import Chip, { type ChipVariants } from '@src/components/primitives/Chip';

import { cn } from '../../../lib/utils';

import { spacingClasses } from './TagGroup.utils';

import type { Spacing } from './TagGroup.types';

export interface TagGroupProps {
  tags: string[]
  variant?: ChipVariants['variant']
  size?: ChipVariants['size']
  onRemove?: (tag: string) => void
  spacing?: Spacing
}

/**
 * TagGroup – Mehrere Chip-Atoms nebeneinander als Gruppe.
 * No className prop – Styling exclusively via variant/size.
 *
 * @example
 * <TagGroup tags={['React', 'TypeScript', 'Python']} variant="primary" />
 * <TagGroup tags={skills} onRemove={(t) => removeSkill(t)} />
 */
export default function TagGroup({ tags, variant, size, onRemove, spacing }: TagGroupProps) {
  if (tags.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', spacing && spacingClasses[spacing])}>
      {tags.map((tag) => (
        <Chip
          key={tag}
          variant={variant}
          size={size}
          onRemove={onRemove ? () => onRemove(tag) : undefined}
        >
          {tag}
        </Chip>
      ))}
    </div>
  );
}
