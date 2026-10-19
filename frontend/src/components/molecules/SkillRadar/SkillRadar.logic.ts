import type { SkillRadarItem } from './SkillRadar.types';

/** Threshold: effective_importance > 4 is Must‑Have. */
const MUST_HAVE_THRESHOLD = 4;

/** Mindestanzahl bestätigter Skills, ab der ein Radar statt der Textliste gezeigt wird. */
export const MIN_SKILLS_FOR_RADAR = 3;

/** Returns deprecated skills (status === 'deprecated'). */
export function filterArchived(skills: SkillRadarItem[]): SkillRadarItem[] {
  return skills.filter((s) => s.status === 'deprecated');
}

/** Filters to active skills only (excludes pending/deprecated). */
export function filterConfirmed(skills: SkillRadarItem[]): SkillRadarItem[] {
  return skills.filter((s) => s.status === 'active' && s.level != null);
}

/** Confirmed Must‑Have skills (effective_importance > 4), sorted by importance DESC. */
export function filterMustHave(skills: SkillRadarItem[]): SkillRadarItem[] {
  return filterConfirmed(skills)
    .filter((s) => (s.effective_importance ?? 0) > MUST_HAVE_THRESHOLD)
    .sort((a, b) => (b.effective_importance ?? 0) - (a.effective_importance ?? 0));
}

/** Confirmed Nice‑to‑have skills (effective_importance ≤ 4), sorted by importance DESC. */
export function filterNiceToHave(skills: SkillRadarItem[]): SkillRadarItem[] {
  return filterConfirmed(skills)
    .filter((s) => (s.effective_importance ?? 0) <= MUST_HAVE_THRESHOLD)
    .sort((a, b) => (b.effective_importance ?? 0) - (a.effective_importance ?? 0));
}

/** Prepares radar-compatible data from confirmed skills. */
export function toRadarData(
  skills: SkillRadarItem[],
): { subject: string; effective_importance: number; level: number; level_public: number }[] {
  return skills.map((s) => ({
    subject: s.name,
    effective_importance: s.effective_importance ?? 0,
    level: s.level ?? 0,
    level_public: s.level_public ?? 0,
  }));
}
