import type { RadarSkill, SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';
import type { components } from '@src/lib/types.generated';

import type { SkillGroupSlide } from './SkillGroupRadarModal.types';

type SkillGroupOut = components['schemas']['SkillGroupOut'];

/** Reservierte ID für den Hero-Slide (Projekt- bzw. Promo-Auswahl) – Gruppen-IDs starten bei 1. */
export const MATCH_SLIDE_ID = 0;

/**
 * Baut die Carousel-Slides aller nicht-leeren Skill-Gruppen in `sort`-Reihenfolge,
 * optional mit dem Hero-Slide (Projekt-Skills oder kuratierte Promo-Auswahl) als
 * erstem Slide (`MATCH_SLIDE_ID`). Wird auf Page-Ebene gebaut und von der einzigen
 * `SkillGroupRadarModal` konsumiert – damit Hero und Grid dieselbe vollständige
 * Slide-Liste (inkl. Hero-Slide) öffnen.
 */
export function buildSkillRadarSlides(
  heroSkills: RadarSkill[] | null,
  groups: SkillGroupOut[],
  skillsByGroup: Record<number, SkillGroupSkill[]>,
): SkillGroupSlide<RadarSkill>[] {
  const groupSlides: SkillGroupSlide<SkillGroupSkill>[] = [...groups]
    .sort((a, b) => a.sort - b.sort)
    .filter((g) => (skillsByGroup[g.id] ?? []).length > 0)
    .map((g) => ({ id: g.id, label: g.label, skills: skillsByGroup[g.id] ?? [] }));

  if (!heroSkills || heroSkills.length === 0) return groupSlides;

  return [{ id: MATCH_SLIDE_ID, skills: heroSkills }, ...groupSlides];
}
