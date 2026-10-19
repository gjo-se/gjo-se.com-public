import type { HomeSkillCard } from './HomeSkillsTeaser.types';

export interface HomeSkillsTeaserProps {
  /** `//`-Eyebrow (Content-Key `home.skills.eyebrow`). */
  eyebrow: string
  /** H2-Überschrift der Sektion (Content-Key `home.skills.heading`). */
  heading: string
  /** Die Kompetenz-Karten – NICHT klickbar (`<article>`). */
  cards: HomeSkillCard[]
  /** Label des einzigen CTAs (Content-Key `home.skills.cta`). */
  ctaLabel: string
  /** Ziel des „Alle Skills"-Links (im Parent `skillsPath` → `/skills`). */
  ctaHref: string
}
