import type { RadarSkill, SkillGroupSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

export interface SkillGroupSlide<T extends RadarSkill = SkillGroupSkill> {
  /** Slide-ID (Gruppen-ID bzw. Carousel-Index beim Match-Scope). */
  id: number;
  /** Lokalisierter Name – optional (Match-Scope hat keine Gruppen-Labels). */
  label?: string;
  /** Skills des Slides (Lightbox zeigt ALLE Werte, kein Top-7-Schnitt). */
  skills: T[];
}
