import { toGroupAnchorId } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.logic';
import type { SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';
import Link from '@src/components/primitives/Link';

import { skillCategoryNavBandVariants, skillCategoryNavInnerVariants } from './SkillCategoryNav.variants';

import type { SkillGroupOut } from './SkillCategoryNav.types';

export interface SkillCategoryNavProps {
  /** Gruppen-Metadaten (id, sort, label) aus der DB – definieren Reihenfolge und Name. */
  groups: SkillGroupOut[];
  /** Public-Skills gruppiert nach group_id – filtert Gruppen ohne Inhalt (keine toten Chips). */
  skillsByGroup: Record<number, SkillGroupSkill[]>;
  /** Aktive Gruppe (Scrollspy) – deren Chip wird eindeutig hervorgehoben. */
  activeGroupId?: number | null;
  /** Feuert beim Chip-Klick (Parent markiert die Karte der Gruppe). */
  onSelect?: (groupId: number) => void;
}

/**
 * SkillCategoryNav – Kategorien-Quicknav der Skills-Seite (Dummy C).
 *
 * Voll-breites Full-Bleed-Band mit zentrierten Mono-Chips (Gruppennamen aus der DB,
 * kein Zähler). Jeder Chip ist eine Sprungmarke zur zugehörigen Gruppen-Karte mit
 * sprechendem Anker (`#clean-code` etc.). Sticky unter dem Header; der Chip der aktuell
 * sichtbaren Gruppe (Scrollspy) ist farblich hervorgehoben – inkl. der Karte im Grid.
 */
export default function SkillCategoryNav({ groups, skillsByGroup, activeGroupId, onSelect }: SkillCategoryNavProps) {
  const sorted = [...groups].sort((a, b) => a.sort - b.sort);
  const chips = sorted.filter((g) => (skillsByGroup[g.id] ?? []).length > 0);

  return (
    <nav aria-label="Skill-Kategorien" className="sticky top-16 z-30">
      {/* Full-Bleed-Band (wie Dummy .skills-nav / Home-Vollbreite-Bänder): Hintergrund +
          Haarlinien brechen mit 100vw aus der Inhalts-Spalte aus. */}
      <div
        aria-hidden="true"
        className={skillCategoryNavBandVariants()}
      />
      <div className={skillCategoryNavInnerVariants()}>
        <div className="flex flex-wrap items-center justify-center gap-2 py-4">
          {chips.map((group) => {
            const isActive = group.id === activeGroupId;
            return (
              <Link
                key={group.id}
                variant={isActive ? 'chip-active' : 'chip'}
                hash={`#${toGroupAnchorId(group.label)}`}
                onClick={() => onSelect?.(group.id)}
              >
                {group.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export type { SkillCategoryNavVariants } from './SkillCategoryNav.variants';
