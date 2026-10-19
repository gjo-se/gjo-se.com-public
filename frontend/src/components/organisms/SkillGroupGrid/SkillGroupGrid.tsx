import type { SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';
import Icon from '@src/components/primitives/Icon';
import Text from '@src/components/primitives/Text';
import { useLanguage } from '@src/contexts/LanguageContext';
import { useContent } from '@src/providers/siteContent/useContent';

import { toCardData, toGroupAnchorId } from '../../molecules/SkillGroupRadar/SkillGroupRadar.logic';

import { BADGE_BASE, BADGE_BY_PRIORITY, CARD_CONTAINER, CONTAINER_BY_PRIORITY } from './SkillGroupGrid.utils';
import { skillGridCtaVariants, skillGridSrOnlyVariants } from './SkillGroupGrid.variants';

import type { SkillGroupOut } from './SkillGroupGrid.types';

export interface SkillGroupGridProps {
  /** Gruppen-Metadaten (id, sort, priority, label) aus der DB – definieren Reihenfolge und Name. */
  groups: SkillGroupOut[];
  /** Public-Skills gruppiert nach group_id. */
  skillsByGroup: Record<number, SkillGroupSkill[]>;
  /** Aktive Gruppe (Scrollspy) – deren Karte wird eindeutig hervorgehoben. */
  activeGroupId?: number | null;
  /** Feuert beim Klick auf eine Gruppen-Karte (Parent öffnet die Page-Lightbox auf diesem Slide). */
  onOpenSlide: (groupId: number) => void;
}

/**
 * SkillGroupGrid – „Gruppen im Detail" der Skills-Seite (Dummy C).
 *
 * Sektionslabel (`//`-Eyebrow + H2) ist **sr-only**: visuell führt die Sticky-Navi mit
 * Sprungmarken, das Label bleibt für Screenreader + Heading-Struktur (`aria-labelledby`,
 * Karten als `h3`). Texte aus `skills.section.eyebrow` / `skills.section.heading`
 * (DE/EN, Code-Fallback). Über den Mono-Badge-Karten der Skill-Gruppen: je
 * Gruppe eine Karte (aus der DB): Titel, Skill-Anzahl (Mono), bis zu sieben Mono-Badges
 * der Skill-Namen (kuratierte Reihenfolge), CTA „Radar öffnen". Die Karten-Proportion
 * folgt der Priority (`high` volle Breite, `medium` halb, `base` Drittel). Klick öffnet
 * die Page-Lightbox (`onOpenSlide`) – konsistent zum Hero.
 */
export type { SkillGroupGridVariants } from './SkillGroupGrid.variants';

export default function SkillGroupGrid({ groups, skillsByGroup, activeGroupId, onOpenSlide }: SkillGroupGridProps) {
  const { lang } = useLanguage();
  const { data: content } = useContent(lang);
  const eyebrow = content['skills.section.eyebrow'] ?? '// Alle Kompetenzen';
  const heading = content['skills.section.heading'] ?? 'Gruppen im Detail';

  const sorted = [...groups].sort((a, b) => a.sort - b.sort);
  const cards = sorted.filter((group) => (skillsByGroup[group.id] ?? []).length > 0);

  return (
    <section
      className="py-section"
      aria-labelledby="skills-grid-title"
    >
      <div className={skillGridSrOnlyVariants()}>
        <div className="shrink-0">
          <Text as="span" variant="eyebrow">{eyebrow}</Text>
        </div>
        <Text as="h2" id="skills-grid-title" variant="title">
          {heading}
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-6 sm:gap-x-6 sm:gap-y-8">
        {cards.map((group) => {
          const priority = group.priority === 'high' || group.priority === 'base' ? group.priority : 'medium';
          const groupSkills = skillsByGroup[group.id] ?? [];
          const badges = toCardData(groupSkills).map((skill) => skill.name);
          const isActive = group.id === activeGroupId;

          return (
            <article
              key={group.id}
              id={toGroupAnchorId(group.label)}
              role="button"
              tabIndex={0}
              onClick={() => onOpenSlide(group.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') onOpenSlide(group.id); }}
              aria-label={`${group.label}: Radar öffnen`}
              className={`scroll-mt-nav ${CARD_CONTAINER.join(' ')} ${CONTAINER_BY_PRIORITY[priority]}${isActive ? ' border-primary ring-2 ring-primary-ring' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <Text as="h3" variant="subtitle" weight="semibold">
                  {group.label}
                </Text>
                <Text as="span" variant="meta" size="xs" color="secondary">
                  {groupSkills.length} Skills
                </Text>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {badges.map((badge) => (
                  <div key={badge} className={`${BADGE_BASE} ${BADGE_BY_PRIORITY[priority]}`}>
                    <Text as="span" variant="meta" size="xs">
                      {badge}
                    </Text>
                  </div>
                ))}
              </div>

              <div className={skillGridCtaVariants()}>
                <Text as="span" variant="meta" size="xs" color="primary">
                  Radar öffnen
                </Text>
                <Icon name="chevron-right" size="xs" aria-hidden />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
