import type { SkillGroupSkill } from './SkillGroupRadar.types';

export interface SkillGroupRadarProps {
  /** Gruppen-ID (DB) – Schlüssel für die Skill-Selektion der Gruppe. */
  group_id: number
  /** Lokalisierter Gruppen-Name (aus den DB-Gruppen-Metadaten). */
  label: string
  /** Public skills dieser Gruppe (aus `useSkillList`). */
  skills: SkillGroupSkill[]
  /** Spannenvoll-breit im Raster (``priority==='high'``) – A/B-Hierarchie wie Portfolio-Proofs. */
  fullWidth?: boolean
  /** Dezimierte Darstellung (``priority==='base'``) – Basis-Stufe, sichtbar nachrangig. */
  base?: boolean
  /** Feuert beim Klick auf die Chart-Fläche (Parent öffnet die Lightbox). */
  onClick?: () => void
}
