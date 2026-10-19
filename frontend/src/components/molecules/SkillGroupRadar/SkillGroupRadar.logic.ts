import {
  getRadarColorImportance,
  getRadarColorLevel,
  toRadarData,
} from '../../charts/ChartShell/ChartShell.utils';

import type { RadarSkill, SkillGroupSkill } from './SkillGroupRadar.types';

/** Karte zeigt die Top-N Skills nach kuratierter Reihenfolge (Plan: Top-7 Default). */
export const TOP_N = 7;
/** Harter Deckel für die Achsen-Anzahl (Plan: max. 10 Achsen). */
export const MAX_AXES = 10;
/** Gruppen mit weniger als 2 aktiven Skills zeigen keinen Radar (Plan: < 2). */
export const MIN_SKILLS_FOR_RADAR = 2;
/** Seitenverhältnis der Karte (analog Portfolio-ProofCard): high 21:9, medium 4:3. */
export const CARD_ASPECT_RATIO = 9 / 21;

/**
 * Radar-Farb-Semantik – zentrale Quelle in `ChartShell.utils.ts` (einzig gültig):
 * Referenz/Importance = Salbei (chart-4), Heldin/Level = Kupfer (chart-1).
 * Diese Re-Exports halten die bestehenden Importe stabil; Definition lebt zentral.
 */
export { getRadarColorImportance, getRadarColorLevel, toRadarData };

/** Sortiert kuratierte Skills nach sort ASC, danach nach importance DESC und name ASC. */
export function sortByImportance(skills: SkillGroupSkill[]): SkillGroupSkill[] {
  return [...skills].sort((a, b) => {
    const sortA = a.sort;
    const sortB = b.sort;
    if (sortA != null || sortB != null) {
      if (sortA == null) return 1;
      if (sortB == null) return -1;
      if (sortA !== sortB) return sortA - sortB;
    }

    const ia = a.importance ?? -1;
    const ib = b.importance ?? -1;
    if (ib !== ia) return ib - ia;
    return a.name.localeCompare(b.name);
  });
}

/** Karten-Daten: Top-7 (Deckel 10) nach kuratierter Reihenfolge. */
export function toCardData(skills: SkillGroupSkill[]): SkillGroupSkill[] {
  return sortByImportance(skills).slice(0, Math.min(TOP_N, MAX_AXES));
}

/**
 * Sprechende Sprungmarke einer Skill-Gruppe aus ihrem Label (z. B. „Clean Code" → `clean-code`).
 * Gemeinsame Quelle für Nav-Chips, Karten-Anker und Scrollspy, damit alle konsistent verlinken.
 */
export function toGroupAnchorId(label: string): string {
  const slug = label
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Akzente entfernen
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'gruppe';
}

/** Top-N Radar-Skills nach Importance (kuratierte Reihenfolge, Deckel) – generisch für jede Skill-Quelle. */
export function topSkillsByImportance(skills: RadarSkill[], n: number): RadarSkill[] {
  return [...skills]
    .sort(
      (a, b) =>
        (b.importance ?? 0) - (a.importance ?? 0) || a.name.localeCompare(b.name),
    )
    .slice(0, n);
}
