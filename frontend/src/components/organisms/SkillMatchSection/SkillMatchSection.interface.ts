import type { MatchSkill } from './SkillMatchSection.types';

export interface SkillMatchSectionProps {
  /** Alle aktiven Skills der Ausschreibung (liefert der Parent via useProjectSkills). */
  skills: MatchSkill[]
  /** Feuert beim Klick auf den Hero (Parent öffnet die Page-Lightbox auf dem Match-Slide). */
  onOpenSlide: (slideId: number) => void
  /** Seiten-Titel (h1) – als Header im Footer-Band des Heroes (identisch zu SkillGroupHero). */
  title: string
  /** Optionaler Seiten-Untertitel im Footer-Band. */
  subtitle?: string
}
