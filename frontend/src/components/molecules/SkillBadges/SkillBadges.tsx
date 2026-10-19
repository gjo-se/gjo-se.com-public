import Chip from '@src/components/primitives/Chip';
import Text from '@src/components/primitives/Text';

import { cn } from '../../../lib/utils';

import { matchVariant, opacityClass, sortSkills } from './SkillBadges.logic';

import type { SkillBadgesProps } from './SkillBadges.interface';

/**
 * SkillBadges – Chip-Reihe der projektbezogenen Skills.
 *
 * Reihenfolge nach effective_importance DESC. Opacity kodiert die
 * effective_importance, die Chip-Variante das Match-Signal.
 *
 * @example
 * <SkillBadges skills={[{ id: 1, name: 'React', effective_importance: 5, level: 4 }]} />
 */
export default function SkillBadges({ skills }: SkillBadgesProps) {
  if (skills.length === 0) {
    return <Text as="span" size="sm" color="muted">Keine Skills verknüpft.</Text>;
  }

  const ordered = sortSkills(skills);

  return (
    <div className="flex flex-wrap gap-1.5">
      {ordered.map((skill) => (
        <div key={skill.id} className={cn('inline-flex', opacityClass(skill.effective_importance))}>
          <Chip variant={matchVariant(skill)} size="sm">
            {skill.name}
          </Chip>
        </div>
      ))}
    </div>
  );
}

export type { SkillBadgesProps } from './SkillBadges.interface';
