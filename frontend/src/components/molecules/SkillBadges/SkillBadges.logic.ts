import type { ChipVariants } from '@src/components/primitives/Chip';
import type { SkillBadgeItem } from '@src/lib/api/aiscopeTypes';

type ChipVariant = NonNullable<ChipVariants['variant']>;

const EFFECTIVE_OPACITY_100 = 4.0;
const EFFECTIVE_OPACITY_80 = 3.5;
const EFFECTIVE_OPACITY_60 = 3.0;

/**
 * Derives the chip variant for a skill's match signal.
 *
 * @param skill The skill to classify.
 * @returns The chip variant name.
 */
export function matchVariant(skill: SkillBadgeItem): ChipVariant {
  if (skill.level == null || skill.effective_importance == null) return 'secondary';
  if (skill.level >= 3) return 'success';
  if (skill.level >= 1) return 'warning';
  return 'secondary';
}

/**
 * Maps a skill's effective_importance to a graded opacity class.
 *
 * @param effective_importance Aggregated importance (0–5) or null.
 * @returns Tailwind opacity utility class.
 */
export function opacityClass(effectiveImportance: number | null): string {
  if (effectiveImportance == null) return 'opacity-40';
  if (effectiveImportance >= EFFECTIVE_OPACITY_100) return 'opacity-100';
  if (effectiveImportance >= EFFECTIVE_OPACITY_80) return 'opacity-80';
  if (effectiveImportance >= EFFECTIVE_OPACITY_60) return 'opacity-60';
  return 'opacity-40';
}

/**
 * Sorts skills for display by effective_importance DESC (nulls last).
 */
export function sortSkills(skills: SkillBadgeItem[]): SkillBadgeItem[] {
  const byImportance = (a: SkillBadgeItem, b: SkillBadgeItem): number =>
    (b.effective_importance ?? -1) - (a.effective_importance ?? -1);
  return [...skills].sort(byImportance);
}
