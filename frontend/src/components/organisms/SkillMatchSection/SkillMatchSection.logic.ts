import {
  getRadarColorImportance,
  getRadarColorLevel,
  toRadarData,
} from '../../charts/ChartShell/ChartShell.utils';

import type { MatchSkill } from './SkillMatchSection.types';

/** Klassifizierung Must-Have: importance > 4 (Plan-Vorgabe; identischer Threshold wie SkillRadar.logic). */
export const MUST_HAVE_THRESHOLD = 4;

/** Karte zeigt die Top-N Skills nach Importance (Plan: Top-7 Default). */
export const TOP_N = 7;
/** Harter Deckel für die Achsen-Anzahl (konsistent mit SkillGroupRadar.logic). */
export const MAX_AXES = 10;
/** Weniger als 2 Skills → Hinweis statt Radar (konsistent mit SkillGroupRadar.logic). */
export const MIN_SKILLS_FOR_RADAR = 2;

/**
 * Radar-Farb-Semantik – zentrale Quelle in `ChartShell.utils.ts` (einzig gültig):
 * Referenz/Importance = Salbei (chart-4), Heldin/Level = Kupfer (chart-1).
 * Diese Re-Exports halten die bestehenden Importe stabil; Definition lebt zentral.
 */
export { getRadarColorImportance, getRadarColorLevel, toRadarData };

/**
 * Sortiert die Ausschreibungs-Skills: Must-Have (importance > 4) zuerst, dann Nice-to-have;
 * jeweils importance DESC (NULLS LAST), Tie-Break name ASC – spiegelt den API-Kontrakt (#2604).
 */
export function sortMatchSkills(skills: MatchSkill[]): MatchSkill[] {
  const byImportance = (a: MatchSkill, b: MatchSkill): number => {
    const ia = a.importance ?? -1;
    const ib = b.importance ?? -1;
    if (ib !== ia) return ib - ia;
    return a.name.localeCompare(b.name);
  };
  return [...skills].sort((a, b) => {
    const aMust = (a.importance ?? 0) > MUST_HAVE_THRESHOLD;
    const bMust = (b.importance ?? 0) > MUST_HAVE_THRESHOLD;
    if (aMust !== bMust) return aMust ? -1 : 1;
    return byImportance(a, b);
  });
}

/** Karten-Daten: Top-7 (Deckel 10), Must-Have zuerst. */
export function toCardData(skills: MatchSkill[]): MatchSkill[] {
  return sortMatchSkills(skills).slice(0, Math.min(TOP_N, MAX_AXES));
}
