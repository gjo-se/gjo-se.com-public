import type { RadarSkill } from '@src/components/molecules/SkillGroupRadar/SkillGroupRadar.types';

import type { SkillGroupSlide } from './SkillGroupRadarModal.types';

export interface SkillGroupRadarModalProps {
  /** Steuert die Dialog-Sichtbarkeit. */
  open: boolean;
  /** Wird beim Schließen (Backdrop, Escape, Close-Button) mit `false` aufgerufen. */
  onOpenChange: (open: boolean) => void;
  /** Alle Slides – Carousel über alle Slides (wie Portfolio-ProofLightbox). */
  groups: SkillGroupSlide<RadarSkill>[];
  /** Start-Slide des Carousels (die beim Klick geöffnete). */
  initialGroupId: number;
}
