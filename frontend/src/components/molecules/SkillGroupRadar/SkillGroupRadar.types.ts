import type { components } from '@src/lib/types.generated';

/** Minimaler Radar-fähiger Skill – alle Radar-Konsumenten (Gruppen & Match) teilen dieses Feld-Subset. */
export interface RadarSkill {
  name: string;
  importance?: number | null;
  level_public?: number | null;
}

/** Public-Skill-Payload aus dem generierten OpenAPI-Schema. */
export type SkillGroupSkill = components['schemas']['app__fbf__schemas__skill_schemas__SkillPublicOut'];
