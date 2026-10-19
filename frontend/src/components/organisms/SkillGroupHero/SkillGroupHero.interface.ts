import type { RadarSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

export interface SkillGroupHeroProps {
  /** Radar-Skills des Heroes – im Normalfall die wichtigste Gruppe, im Proof-Modus das Projekt. */
  skills: RadarSkill[];
  /** Feuert beim Klick auf den Radar (Parent öffnet die Page-Lightbox auf diesem Slide). */
  onOpenSlide: (targetId: number) => void;
  /** Slide, den der Klick im Lightbox-Carousel öffnet. */
  openSlideTarget: number;
  /** Serif-H1 des Heroes (Text-Spalte links) – lokalisierte Content-Key mit Dummy-Fallback. */
  title: string;
  /** Mono/Primary-USP-Zeile unter der Headline (z. B. „AI · Architektur · Clean Code"). */
  usp?: string;
  /** Lead-Subline unter der USP – erklärt die Headline. */
  subline?: string;
}
